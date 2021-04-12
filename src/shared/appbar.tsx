import './appbar.css';
import 'react-toggle/style.css'
import Toggle from 'react-toggle';

export default function AppBar({ authContext }) {
    const dom: any = [];
    for (let i in authContext.activeSubscription.apps) {
        const app = authContext.activeSubscription.apps[i];
        if (authContext.centralApps.indexOf(app.properties.applicationId) === -1) { continue; }
        const checked = authContext.filteredApps.indexOf(app.properties.applicationId) > -1;
        dom.push(<div key={app.name} className='app'>
            <div>{app.properties.displayName}</div>
            <Toggle name={app.name + '-enabled'} icons={false} className='app-toggle' checked={checked}
                onChange={() => { authContext.setAppsFilter(app.properties.applicationId); }} />
        </div>)
    }
    return <div className='appbar'>{dom}</div>;
}