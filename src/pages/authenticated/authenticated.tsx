import './authenticated.css';
import { RESX } from '../../strings'
import { AuthContext } from '../../context/authContext';
import { DataContext } from '../../context/dataContext';
import useDevices from '../../hooks/useDevices'
import RingLoader from 'react-spinners/RingLoader';

import Masthead from '../../shared/masthead';
import NavBar from '../../shared/navbar';
import AppBar from '../../shared/appbar';

import Map from '../map/map';
import Apps from '../apps/apps';
import Drivers from '../drivers/drivers';
import Devices from '../devices/devices';
// import Jobs from '../jobs/jobs';

import React from 'react';
import { Route, Redirect } from 'react-router-dom'

const nav = [
    { label: RESX.navigation.menuLabels[0], icon: null, link: '/map', title: RESX.navigation.menuLabels[0] },
    { label: RESX.navigation.menuLabels[1], icon: null, link: '/fleet', title: RESX.navigation.menuLabels[1] },
    { label: RESX.navigation.menuLabels[2], icon: null, link: '/drivers', title: RESX.navigation.menuLabels[2] },
    { label: RESX.navigation.menuLabels[3], icon: null, link: '/apps', title: RESX.navigation.menuLabels[3] },
    
]

/* UX */

function Page({ authContext, dataContext, loadingDevices }) {

    return <div className='auth-page'>
        <div className='header'>
            <Masthead signOutHander={() => { authContext.signOut() }} subscriptionName={authContext.activeSubscription.subscription.displayName} appCount={authContext.activeSubscription.apps.length} />
        </div>
        <div className='content'>
            <div className='navigation'>
                <h4>{RESX.navigation.title1}
                    {loadingDevices ? <RingLoader size={16} /> : null}
                </h4>
                <AppBar authContext={authContext} />
                <h4>{RESX.navigation.title2}</h4>
                <NavBar nav={nav} />
            </div>
            <div className='workspace'>
                <Route path='/map' component={Map} />
                <Route path='/fleet'>
                    <Devices authContext={authContext} dataContext={dataContext} />
                </Route>
                <Route path='/drivers' component={Drivers} />
                <Route path='/apps' component={Apps} />
                <Route exact path='/'>
                    <Redirect to='map' />
                </Route>
                
            </div>
        </div>
    </div>
}

/* Render */

export default function Authenticated() {
    const authContext: any = React.useContext(AuthContext);
    const dataContext: any = React.useContext(DataContext);
    const [initFetch, setInit] = React.useState(false);

    const [loadingDevices, , , fetch] = useDevices(false);

    React.useEffect(() => {
        if (initFetch) { return; }
        fetch();
        setInit(true);
        // eslint-disable-next-line
    }, [authContext.filteredApps])

    return <Page authContext={authContext} dataContext={dataContext} loadingDevices={loadingDevices} />
}