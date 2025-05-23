'use client';
import * as React from 'react';
import PropTypes from 'prop-types';
import { styled, useTheme, SxProps } from '@mui/material';
import MuiAppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
import type {} from '@mui/material/themeCssVarsAugmentation';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { BrandingContext, NavigationContext, WindowContext } from '../shared/context';
import { Account, type AccountProps } from '../Account';
import { DashboardSidebarSubNavigation } from './DashboardSidebarSubNavigation';
import { ToolbarActions } from './ToolbarActions';
import { AppTitle, AppTitleProps } from './AppTitle';
import { getDrawerSxTransitionMixin, getDrawerWidthTransitionMixin } from './utils';
import { MINI_DRAWER_WIDTH } from './shared';
import type { Branding, Navigation, NavigationPageItem } from '../AppProvider';

const AppBar = styled(MuiAppBar)(({ theme }) => ({
  borderWidth: 0,
  borderBottomWidth: 1,
  borderStyle: 'solid',
  borderColor: (theme.vars ?? theme).palette.divider,
  boxShadow: 'none',
  zIndex: theme.zIndex.drawer + 1,
}));

export interface SidebarFooterProps {
  mini: boolean;
}

export interface DashboardLayoutSlotProps {
  appTitle?: AppTitleProps;
  toolbarActions?: {};
  toolbarAccount?: AccountProps;
  sidebarFooter?: SidebarFooterProps;
}

export interface DashboardLayoutSlots {
  /**
   * The component used for the app title section in the layout header.
   * @default Link
   */
  appTitle?: React.ElementType;
  /**
   * The toolbar actions component used in the layout header.
   * @default ToolbarActions
   */
  toolbarActions?: React.JSXElementConstructor<{}>;
  /**
   * The toolbar account component used in the layout header.
   * @default Account
   */
  toolbarAccount?: React.JSXElementConstructor<AccountProps>;
  /**
   * Optional footer component used in the layout sidebar.
   * @default null
   */
  sidebarFooter?: React.JSXElementConstructor<SidebarFooterProps>;
}

export interface DashboardLayoutProps {
  /**
   * The content of the dashboard.
   */
  children: React.ReactNode;
  /**
   * Branding options for the dashboard.
   * @default null
   */
  branding?: Branding | null;
  /**
   * Navigation definition for the dashboard. [Find out more](https://mui.com/toolpad/core/react-dashboard-layout/#navigation).
   * @default []
   */
  navigation?: Navigation;
  /**
   * Whether the sidebar should start collapsed in desktop size screens.
   * @default false
   */
  defaultSidebarCollapsed?: boolean;
  /**
   * Whether the sidebar should not be collapsible to a mini variant in desktop and tablet viewports.
   * @default false
   */
  disableCollapsibleSidebar?: boolean;
  /**
   * Whether the navigation bar and menu icon should be hidden.
   * @default false
   */
  hideNavigation?: boolean;
  /**
   * Width of the sidebar when expanded.
   * @default 320
   */
  sidebarExpandedWidth?: number | string;
  /**
   * Render each page item.
   *
   * @param {NavigationPageItem} item
   * @param {{ mini: boolean }} params
   * @returns {ReactNode}
   */
  renderPageItem?: (item: NavigationPageItem, params: { mini: boolean }) => React.ReactNode;
  /**
   * The components used for each slot inside.
   * @default {}
   */
  slots?: DashboardLayoutSlots;
  /**
   * The props used for each slot inside.
   * @default {}
   */
  slotProps?: DashboardLayoutSlotProps;
  /**
   * The system prop that allows defining system overrides as well as additional CSS styles.
   */
  sx?: SxProps;
}

/**
 *
 * Demos:
 *
 * - [Dashboard Layout](https://mui.com/toolpad/core/react-dashboard-layout/)
 *
 * API:
 *
 * - [DashboardLayout API](https://mui.com/toolpad/core/api/dashboard-layout)
 */
function DashboardLayout(props: DashboardLayoutProps) {
  const {
    children,
    branding: brandingProp,
    navigation: navigationProp,
    defaultSidebarCollapsed = false,
    disableCollapsibleSidebar = false,
    hideNavigation = false,
    sidebarExpandedWidth = 320,
    renderPageItem,
    slots,
    slotProps,
    sx,
  } = props;

  const theme = useTheme();

  const brandingContext = React.useContext(BrandingContext);
  const navigationContext = React.useContext(NavigationContext);
  const appWindowContext = React.useContext(WindowContext);

  const branding = { ...brandingContext, ...brandingProp };
  const navigation = navigationProp ?? navigationContext;

  const [isDesktopNavigationExpanded, setIsDesktopNavigationExpanded] =
    React.useState(!defaultSidebarCollapsed);
  const [isMobileNavigationExpanded, setIsMobileNavigationExpanded] = React.useState(false);

  const isOverSmViewport = useMediaQuery(
    theme.breakpoints.up('sm'),
    appWindowContext && {
      matchMedia: appWindowContext.matchMedia,
    },
  );
  const isOverMdViewport = useMediaQuery(
    theme.breakpoints.up('md'),
    appWindowContext && {
      matchMedia: appWindowContext.matchMedia,
    },
  );

  const isNavigationExpanded = isOverMdViewport
    ? isDesktopNavigationExpanded
    : isMobileNavigationExpanded;

  const setIsNavigationExpanded = React.useCallback(
    (newExpanded: boolean) => {
      if (isOverMdViewport) {
        setIsDesktopNavigationExpanded(newExpanded);
      } else {
        setIsMobileNavigationExpanded(newExpanded);
      }
    },
    [isOverMdViewport],
  );

  const [isNavigationFullyExpanded, setIsNavigationFullyExpanded] =
    React.useState(isNavigationExpanded);
  const [isNavigationFullyCollapsed, setIsNavigationFullyCollapsed] =
    React.useState(!isNavigationExpanded);

  React.useEffect(() => {
    if (isNavigationExpanded) {
      const drawerWidthTransitionTimeout = setTimeout(() => {
        setIsNavigationFullyExpanded(true);
      }, theme.transitions.duration.enteringScreen);

      return () => clearTimeout(drawerWidthTransitionTimeout);
    }

    setIsNavigationFullyExpanded(false);

    return () => {};
  }, [isNavigationExpanded, theme]);

  React.useEffect(() => {
    if (!isNavigationExpanded) {
      const drawerWidthTransitionTimeout = setTimeout(() => {
        setIsNavigationFullyCollapsed(true);
      }, theme.transitions.duration.leavingScreen);

      return () => clearTimeout(drawerWidthTransitionTimeout);
    }

    setIsNavigationFullyCollapsed(false);

    return () => {};
  }, [isNavigationExpanded, theme]);

  const handleSetNavigationExpanded = React.useCallback(
    (newExpanded: boolean) => () => {
      setIsNavigationExpanded(newExpanded);
    },
    [setIsNavigationExpanded],
  );

  const toggleNavigationExpanded = React.useCallback(() => {
    setIsNavigationExpanded(!isNavigationExpanded);
  }, [isNavigationExpanded, setIsNavigationExpanded]);

  const handleNavigationLinkClick = React.useCallback(() => {
    setIsMobileNavigationExpanded(false);
  }, [setIsMobileNavigationExpanded]);

  const isDesktopMini = !disableCollapsibleSidebar && !isDesktopNavigationExpanded;
  const isMobileMini = !disableCollapsibleSidebar && !isMobileNavigationExpanded;

  const getMenuIcon = React.useCallback(
    (isExpanded: boolean) => {
      const expandMenuActionText = 'Expand';
      const collapseMenuActionText = 'Collapse';

      return (
        <Tooltip
          title={`${isExpanded ? collapseMenuActionText : expandMenuActionText} menu`}
          enterDelay={1000}
        >
          <div>
            <IconButton
              aria-label={`${isExpanded ? collapseMenuActionText : expandMenuActionText} navigation menu`}
              onClick={toggleNavigationExpanded}
            >
              {isExpanded ? <MenuOpenIcon /> : <MenuIcon />}
            </IconButton>
          </div>
        </Tooltip>
      );
    },
    [toggleNavigationExpanded],
  );

  const hasDrawerTransitions = isOverSmViewport && (!disableCollapsibleSidebar || isOverMdViewport);

  const ToolbarActionsSlot = slots?.toolbarActions ?? ToolbarActions;
  const ToolbarAccountSlot = slots?.toolbarAccount ?? Account;
  const SidebarFooterSlot = slots?.sidebarFooter ?? null;

  const getDrawerContent = React.useCallback(
    (isMini: boolean, viewport: 'phone' | 'tablet' | 'desktop') => (
      <React.Fragment>
        <Toolbar />
        <Box
          component="nav"
          aria-label={`${viewport.charAt(0).toUpperCase()}${viewport.slice(1)}`}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'auto',
            scrollbarGutter: isMini ? 'stable' : 'auto',
            overflowX: 'hidden',
            pt: navigation[0]?.kind === 'header' && !isMini ? 0 : 2,
            ...(hasDrawerTransitions
              ? getDrawerSxTransitionMixin(isNavigationFullyExpanded, 'padding')
              : {}),
          }}
        >
          <DashboardSidebarSubNavigation
            subNavigation={navigation}
            onLinkClick={handleNavigationLinkClick}
            isMini={isMini}
            isFullyExpanded={isNavigationFullyExpanded}
            isFullyCollapsed={isNavigationFullyCollapsed}
            hasDrawerTransitions={hasDrawerTransitions}
            sidebarExpandedWidth={sidebarExpandedWidth}
            renderPageItem={renderPageItem}
          />
          {SidebarFooterSlot ? (
            <SidebarFooterSlot mini={isMini} {...slotProps?.sidebarFooter} />
          ) : null}
        </Box>
      </React.Fragment>
    ),
    [
      SidebarFooterSlot,
      handleNavigationLinkClick,
      hasDrawerTransitions,
      isNavigationFullyCollapsed,
      isNavigationFullyExpanded,
      navigation,
      sidebarExpandedWidth,
      renderPageItem,
      slotProps?.sidebarFooter,
    ],
  );

  const getDrawerSharedSx = React.useCallback(
    (isMini: boolean, isTemporary: boolean) => {
      const drawerWidth = isMini ? MINI_DRAWER_WIDTH : sidebarExpandedWidth;

      return {
        displayPrint: 'none',
        width: drawerWidth,
        flexShrink: 0,
        ...getDrawerWidthTransitionMixin(isNavigationExpanded),
        ...(isTemporary ? { position: 'absolute' } : {}),
        [`& .MuiDrawer-paper`]: {
          position: 'absolute',
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundImage: 'none',
          ...getDrawerWidthTransitionMixin(isNavigationExpanded),
        },
      };
    },
    [isNavigationExpanded, sidebarExpandedWidth],
  );

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        overflow: 'hidden',
        height: '100vh',
        width: '100vw',
        ...sx,
      }}
    >
      <AppBar color="inherit" position="absolute" sx={{ displayPrint: 'none' }}>
        <Toolbar sx={{ backgroundColor: 'inherit', mx: { xs: -0.75, sm: -1 } }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              flexWrap: 'wrap',
              width: '100%',
            }}
          >
            <Stack direction="row">
              {!hideNavigation ? (
                <React.Fragment>
                  <Box
                    sx={{
                      mr: { sm: disableCollapsibleSidebar ? 0 : 1 },
                      display: { md: 'none' },
                    }}
                  >
                    {getMenuIcon(isMobileNavigationExpanded)}
                  </Box>
                  <Box
                    sx={{
                      display: { xs: 'none', md: disableCollapsibleSidebar ? 'none' : 'block' },
                      mr: disableCollapsibleSidebar ? 0 : 1,
                    }}
                  >
                    {getMenuIcon(isDesktopNavigationExpanded)}
                  </Box>
                </React.Fragment>
              ) : null}
              {slots?.appTitle ? (
                <slots.appTitle {...slotProps?.appTitle} />
              ) : (
                /* Hierarchy of application of `branding`
                 * 1. Branding prop passed in the `slotProps.appTitle`
                 * 2. Branding prop passed to the `DashboardLayout`
                 * 3. Branding prop passed to the `AppProvider`
                 */
                <AppTitle branding={branding} {...slotProps?.appTitle} />
              )}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ marginLeft: 'auto' }}>
              <ToolbarActionsSlot {...slotProps?.toolbarActions} />
              <ToolbarAccountSlot {...slotProps?.toolbarAccount} />
            </Stack>
          </Stack>
        </Toolbar>
      </AppBar>

      {!hideNavigation ? (
        <React.Fragment>
          <Drawer
            container={appWindowContext?.document.body}
            variant="temporary"
            open={isMobileNavigationExpanded}
            onClose={handleSetNavigationExpanded(false)}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: {
                xs: 'block',
                sm: disableCollapsibleSidebar ? 'block' : 'none',
                md: 'none',
              },
              ...getDrawerSharedSx(false, true),
            }}
          >
            {getDrawerContent(false, 'phone')}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: {
                xs: 'none',
                sm: disableCollapsibleSidebar ? 'none' : 'block',
                md: 'none',
              },
              ...getDrawerSharedSx(isMobileMini, false),
            }}
          >
            {getDrawerContent(isMobileMini, 'tablet')}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              ...getDrawerSharedSx(isDesktopMini, false),
            }}
          >
            {getDrawerContent(isDesktopMini, 'desktop')}
          </Drawer>
        </React.Fragment>
      ) : null}

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
        }}
      >
        <Toolbar sx={{ displayPrint: 'none' }} />
        <Box
          component="main"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

DashboardLayout.propTypes /* remove-proptypes */ = {
  // ┌────────────────────────────── Warning ──────────────────────────────┐
  // │ These PropTypes are generated from the TypeScript type definitions. │
  // │ To update them, edit the TypeScript types and run `pnpm proptypes`. │
  // └─────────────────────────────────────────────────────────────────────┘
  /**
   * Branding options for the dashboard.
   * @default null
   */
  branding: PropTypes.shape({
    homeUrl: PropTypes.string,
    logo: PropTypes.node,
    title: PropTypes.string,
  }),
  /**
   * The content of the dashboard.
   */
  children: PropTypes.node,
  /**
   * Whether the sidebar should start collapsed in desktop size screens.
   * @default false
   */
  defaultSidebarCollapsed: PropTypes.bool,
  /**
   * Whether the sidebar should not be collapsible to a mini variant in desktop and tablet viewports.
   * @default false
   */
  disableCollapsibleSidebar: PropTypes.bool,
  /**
   * Whether the navigation bar and menu icon should be hidden.
   * @default false
   */
  hideNavigation: PropTypes.bool,
  /**
   * Navigation definition for the dashboard. [Find out more](https://mui.com/toolpad/core/react-dashboard-layout/#navigation).
   * @default []
   */
  navigation: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.shape({
        action: PropTypes.node,
        children: PropTypes.arrayOf(
          PropTypes.oneOfType([
            PropTypes.object,
            PropTypes.shape({
              kind: PropTypes.oneOf(['header']).isRequired,
              title: PropTypes.string.isRequired,
            }),
            PropTypes.shape({
              kind: PropTypes.oneOf(['divider']).isRequired,
            }),
          ]).isRequired,
        ),
        icon: PropTypes.node,
        kind: PropTypes.oneOf(['page']),
        pattern: PropTypes.string,
        segment: PropTypes.string,
        title: PropTypes.string,
      }),
      PropTypes.shape({
        kind: PropTypes.oneOf(['header']).isRequired,
        title: PropTypes.string.isRequired,
      }),
      PropTypes.shape({
        kind: PropTypes.oneOf(['divider']).isRequired,
      }),
    ]).isRequired,
  ),
  /**
   * Render each page item.
   *
   * @param {NavigationPageItem} item
   * @param {{ mini: boolean }} params
   * @returns {ReactNode}
   */
  renderPageItem: PropTypes.func,
  /**
   * Width of the sidebar when expanded.
   * @default 320
   */
  sidebarExpandedWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  /**
   * The props used for each slot inside.
   * @default {}
   */
  slotProps: PropTypes.shape({
    appTitle: PropTypes.shape({
      branding: PropTypes.shape({
        homeUrl: PropTypes.string,
        logo: PropTypes.node,
        title: PropTypes.string,
      }),
    }),
    sidebarFooter: PropTypes.shape({
      mini: PropTypes.bool.isRequired,
    }),
    toolbarAccount: PropTypes.shape({
      localeText: PropTypes.object,
      slotProps: PropTypes.shape({
        popover: PropTypes.object,
        popoverContent: PropTypes.object,
        preview: PropTypes.object,
        signInButton: PropTypes.object,
        signOutButton: PropTypes.object,
      }),
      slots: PropTypes.shape({
        popover: PropTypes.elementType,
        popoverContent: PropTypes.elementType,
        preview: PropTypes.elementType,
        signInButton: PropTypes.elementType,
        signOutButton: PropTypes.elementType,
      }),
    }),
    toolbarActions: PropTypes.object,
  }),
  /**
   * The components used for each slot inside.
   * @default {}
   */
  slots: PropTypes.shape({
    appTitle: PropTypes.elementType,
    sidebarFooter: PropTypes.elementType,
    toolbarAccount: PropTypes.elementType,
    toolbarActions: PropTypes.elementType,
  }),
  /**
   * The system prop that allows defining system overrides as well as additional CSS styles.
   */
  sx: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.func, PropTypes.object, PropTypes.bool])),
    PropTypes.func,
    PropTypes.object,
  ]),
} as any;

export { DashboardLayout };
