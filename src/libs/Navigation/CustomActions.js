import _ from 'underscore';
import {
    StackActions, getStateFromPath, getActionFromState, CommonActions,
} from '@react-navigation/native';
import lodashGet from 'lodash/get';
import linkingConfig from './linkingConfig';
import navigationRef from './navigationRef';

/**
 * Go back to the Main Drawer
 * @param {Object} navigationRef
 */
function navigateBackToRootDrawer() {
    let isLeavingNestedDrawerNavigator = false;

    // This should take us to the first view of the modal's stack navigator
    navigationRef.current.dispatch((state) => {
        // If this is a nested drawer navigator then we pop the screen and
        // prevent calling goBack() as it's default behavior is to toggle open the active drawer
        if (state.type === 'drawer') {
            isLeavingNestedDrawerNavigator = true;
            return StackActions.pop();
        }

        // If there are multiple routes then we can pop back to the first route
        if (state.routes.length > 1) {
            return StackActions.popToTop();
        }

        // Otherwise, we are already on the last page of a modal so just do nothing here as goBack() will navigate us
        // back to the screen we were on before we opened the modal.
        return StackActions.pop(0);
    });

    if (isLeavingNestedDrawerNavigator) {
        return;
    }

    // Navigate back to where we were before we launched the modal
    if (navigationRef.current.canGoBack()) {
        navigationRef.current.goBack();
    }
}

/**
 * Extracts the route from state object. Note: In the context where this is used currently the method is dependable.
 * However, as our navigation system grows in complexity we may need to revisit this to be sure it is returning the expected route object.
 *
 * @param {Object} state
 * @return {Object}
 */
function getRouteFromState(state) {
    return lodashGet(state, 'routes[0].state.routes[0]', {});
}

/**
 * @param {Object} state
 * @returns {Object}
 */
function getParamsFromState(state) {
    return getRouteFromState(state).params || {};
}

/**
 * @param {Object} state
 * @returns {String}
 */
function getScreenNameFromState(state) {
    return getRouteFromState(state).name || '';
}

/**
 * @returns {Object}
 */
function getActiveState() {
    // We use our RootState as the dispatch's state is relative to the active navigator and might not contain our active screen.
    return navigationRef.current.getRootState();
}

/**
 * Special accomodation must be made for navigating to a screen inside a DrawerNavigator (e.g. our ReportScreen). The web/mWeb default behavior when
 * calling "navigate()" does not give us the browser history we would expect for a typical web paradigm (e.g. that navigating from one screen another
 * should allow us to navigate back to the screen we were on previously). This custom action helps us get around these problems.
 *
 * More context here: https://github.com/react-navigation/react-navigation/issues/9744
 *
 * @param {String} route
 */
function pushDrawerRoute(route) {
    const rootState = getActiveState();

    // Parse the state, name, and params from the new route we want to navigate to.
    const newStateFromRoute = getStateFromPath(route, linkingConfig.config);
    const newScreenName = getScreenNameFromState(newStateFromRoute);
    const newScreenParams = getParamsFromState(newStateFromRoute);

    const state = {
        ...rootState.routes[0].state,
        index: 0,
        routes: [{
            name: newScreenName,
            params: newScreenParams,
        }],
    };

    const screenRoute = {type: 'route', name: newScreenName};
    const history = _.map(state.history ? [...state.history] : [screenRoute], () => screenRoute);

    // Force drawer to close and show
    history.push({
        type: 'drawer',
        status: 'closed',
    });
    state.history = history;

    if (rootState.routes.length > 1) {
        const homRoute = {
            ...rootState.routes[0],
            state,
        };

        const action = getActionFromState({
            index: 0,
            routes: [homRoute],
        });
        navigationRef.current.dispatch(action);
    } else {
        navigationRef.current.dispatch(CommonActions.reset(state));
    }
}

export default {
    pushDrawerRoute,
    navigateBackToRootDrawer,
};
