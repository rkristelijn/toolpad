/* eslint-disable no-console */
import * as path from 'path';
import * as fse from 'fs-extra';
import * as prettier from 'prettier';
import glob from 'fast-glob';
import * as _ from 'lodash';
import * as yargs from 'yargs';
import * as ts from 'typescript';
import { fixBabelGeneratorIssues, fixLineEndings } from '@mui/internal-docs-utils';
import {
  getPropTypesFromFile,
  injectPropTypesInFile,
  InjectPropTypesInFileOptions,
} from '@mui/internal-scripts/typescript-to-proptypes';
import {
  createTypeScriptProjectBuilder,
  TypeScriptProject,
} from '@mui-internal/api-docs-builder/utils/createTypeScriptProject';

import CORE_TYPESCRIPT_PROJECTS from './coreTypescriptProjects';

function sortSizeByScaleAscending(a: ts.LiteralType, b: ts.LiteralType) {
  const sizeOrder: readonly unknown[] = ['"small"', '"medium"', '"large"'];
  return sizeOrder.indexOf(a.value) - sizeOrder.indexOf(b.value);
}

// Custom order of literal unions by component
const getSortLiteralUnions: InjectPropTypesInFileOptions['getSortLiteralUnions'] = (
  component,
  propType,
) => {
  if (propType.name === 'size') {
    return sortSizeByScaleAscending;
  }

  return undefined;
};

async function generateProptypes(
  project: TypeScriptProject,
  sourceFile: string,
  tsFile: string,
): Promise<void> {
  const sourceContent = await fse.readFile(sourceFile, 'utf8');

  if (
    sourceContent.match(/@ignore - internal component\./) ||
    sourceContent.match(/@ignore - internal hook\./) ||
    sourceContent.match(/@ignore - do not document\./)
  ) {
    return;
  }

  const components = getPropTypesFromFile({
    filePath: tsFile,
    project,
    shouldResolveObject: ({ name }) => {
      const propsToNotResolve = ['localeText'];

      if (propsToNotResolve.includes(name)) {
        return false;
      }
      if (
        name.toLowerCase().endsWith('classes') ||
        name === 'theme' ||
        name === 'ownerState' ||
        name === 'dataSource' ||
        (name.endsWith('Props') && name !== 'componentsProps' && name !== 'slotProps')
      ) {
        return false;
      }
      return undefined;
    },
    checkDeclarations: true,
  });

  if (components.length === 0) {
    return;
  }

  // exclude internal slot components, for example ButtonRoot
  const cleanComponents = components.filter((component) => {
    if (component.propsFilename?.endsWith('.tsx')) {
      // only check for .tsx
      const match = component.propsFilename.match(/.*\/([A-Z][a-zA-Z]+)\.tsx/);
      if (match) {
        return component.name === match[1];
      }
    }
    return true;
  });

  cleanComponents.forEach((component) => {
    component.types.forEach((prop) => {
      if (!prop.jsDoc) {
        prop.jsDoc = '@ignore';
      }
    });
  });

  const isTsFile = /(\.(ts|tsx))/.test(sourceFile);

  // TODO remove, should only have .types.ts
  const propsFile = tsFile.replace(/(\.d\.ts|\.tsx|\.ts)/g, 'Props.ts');
  const propsFileAlternative = tsFile.replace(/(\.d\.ts|\.tsx|\.ts)/g, '.types.ts');
  const generatedForTypeScriptFile = sourceFile === tsFile;
  const result = injectPropTypesInFile({
    components,
    target: sourceContent,
    options: {
      disablePropTypesTypeChecking: generatedForTypeScriptFile,
      babelOptions: {
        filename: sourceFile,
      },
      comment: [
        '┌────────────────────────────── Warning ──────────────────────────────┐',
        '│ These PropTypes are generated from the TypeScript type definitions. │',
        isTsFile
          ? '│ To update them, edit the TypeScript types and run `pnpm proptypes`. │'
          : '│    To update them, edit the d.ts file and run `pnpm proptypes`.     │',
        '└─────────────────────────────────────────────────────────────────────┘',
      ].join('\n'),
      ensureBabelPluginTransformReactRemovePropTypesIntegration: true,
      getSortLiteralUnions,
      reconcilePropTypes: (prop, previous, generated) => {
        const usedCustomValidator = previous !== undefined && !previous.startsWith('PropTypes');
        const ignoreGenerated =
          previous !== undefined &&
          previous.startsWith('PropTypes /* @typescript-to-proptypes-ignore */');

        if (
          ignoreGenerated &&
          // `ignoreGenerated` implies that `previous !== undefined`
          previous!
            .replace('PropTypes /* @typescript-to-proptypes-ignore */', 'PropTypes')
            .replace(/\s/g, '') === generated.replace(/\s/g, '')
        ) {
          throw new Error(
            `Unused \`@typescript-to-proptypes-ignore\` directive for prop '${prop.name}'.`,
          );
        }

        if (usedCustomValidator || ignoreGenerated) {
          // `usedCustomValidator` and `ignoreGenerated` narrow `previous` to `string`
          return previous!;
        }

        return generated;
      },
      shouldInclude: ({ prop }) => {
        if (prop.name === 'children') {
          return true;
        }
        let shouldDocument;

        prop.filenames.forEach((filename) => {
          const isExternal = filename !== tsFile;
          const implementedBySelfPropsFile =
            filename === propsFile || filename === propsFileAlternative;
          if (!isExternal || implementedBySelfPropsFile) {
            shouldDocument = true;
          }
        });

        return shouldDocument;
      },
    },
  });

  if (!result) {
    throw new Error('Unable to produce inject propTypes into code.');
  }

  const prettierConfig = await prettier.resolveConfig(process.cwd(), {
    config: path.join(__dirname, '../prettier.config.js'),
  });

  const prettified = await prettier.format(result, { ...prettierConfig, filepath: sourceFile });
  const formatted = fixBabelGeneratorIssues(prettified);
  const correctedLineEndings = fixLineEndings(sourceContent, formatted);

  await fse.writeFile(sourceFile, correctedLineEndings);
}

interface HandlerArgv {
  pattern: string;
}
async function run(argv: HandlerArgv) {
  const { pattern } = argv;

  const filePattern = new RegExp(pattern);
  if (pattern.length > 0) {
    console.log(`Only considering declaration files matching ${filePattern}`);
  }

  const buildProject = createTypeScriptProjectBuilder(CORE_TYPESCRIPT_PROJECTS);

  // Matches files where the folder and file both start with uppercase letters
  // Example: AppBar/AppBar.d.ts
  const allFiles = await Promise.all(
    [path.resolve(__dirname, '../packages/toolpad-core/src')].map((folderPath) =>
      glob('+([A-Z])*/+([A-Z])*.*@(d.ts|ts|tsx)', {
        absolute: true,
        cwd: folderPath,
      }),
    ),
  );

  const files = _.flatten(allFiles)
    .filter((filePath) => {
      // Filter out files where the directory name and filename doesn't match
      // Example: Modal/ModalManager.d.ts
      let folderName = path.basename(path.dirname(filePath));
      const fileName = path.basename(filePath).replace(/(\.d\.ts|\.tsx|\.ts)/g, '');

      // An exception is if the folder name starts with Unstable_/unstable_
      // Example: Unstable_Grid2/Grid2.tsx
      if (/(u|U)nstable_/g.test(folderName)) {
        folderName = folderName.slice(9);
      }

      return !fileName.endsWith('.test');
    })
    .filter((filePath) => filePattern.test(filePath));

  const promises = files.map<Promise<void>>(async (tsFile) => {
    const sourceFile = tsFile.includes('.d.ts') ? tsFile.replace('.d.ts', '.js') : tsFile;
    try {
      const projectName = tsFile.match(/packages\/([a-zA-Z-]+)\/src/)![1];
      const project = buildProject(projectName);
      await generateProptypes(project, sourceFile, tsFile);
    } catch (error: any) {
      error.message = `${tsFile}: ${error.message}`;
      throw error;
    }
  });

  const results = await Promise.allSettled(promises);

  const fails = results.filter((result): result is PromiseRejectedResult => {
    return result.status === 'rejected';
  });

  fails.forEach((result) => {
    console.error(result.reason);
  });
  if (fails.length > 0) {
    process.exit(1);
  }
}

yargs
  .command<HandlerArgv>({
    command: '$0',
    describe: 'Generates Component.propTypes from TypeScript declarations',
    builder: (command) => {
      return command.option('pattern', {
        default: '',
        describe: 'Only considers declaration files matching this pattern.',
        type: 'string',
      });
    },
    handler: run,
  })
  .help()
  .strict(true)
  .version(false)
  .parse();
