import './apps.css';
import { RESX } from '../../strings'
import { Config } from '../../config'
import { Styles } from '../../shared/styles';
import { AuthContext } from '../../context/authContext';
import usePromise from '../../hooks/usePromise';
import BeatLoader from 'react-spinners/BeatLoader';

import axios from 'axios';
import React from 'react';

/* API */

function getUserCounts(authContext: any, applications: any) {
    return new Promise(async (resolve, reject) => {
        const apps: any = {};
        const accessToken = await authContext.getCentralAccessToken();
        try {
            for (const i in applications) {
                const appHost = applications[i].properties.subdomain + Config.AppDNS;
                const res = await axios.get(`https://${appHost}/api/users?api-version=${Config.APIVersion}`, { headers: { Authorization: 'Bearer ' + accessToken } })
                apps[applications[i].properties.applicationId] = res.data.value.length;
            }
            resolve(apps);
        } catch (error) {
            reject(error);
        }
    });
}

/* UX */

export default function Apps() {
    const authContext: any = React.useContext(AuthContext);
    const [fetchingCounts, userCounts, , fetchCounts] = usePromise({ promiseFn: () => getUserCounts(authContext, authContext.activeSubscription.apps) });

    // eslint-disable-next-line
    React.useEffect(() => { fetchCounts(); }, [authContext, authContext.activeSubscription.apps])

    const cards: any = [];
    for (const a in authContext.activeSubscription.apps) {
        const app = authContext.activeSubscription.apps[a];
        const include = authContext.filteredApps.indexOf(app.properties.applicationId) > -1;
        if (!include) { continue };

        const appHost = app.properties.subdomain + Config.AppDNS;
        cards.push(<div key={app.name} className='app-card'>
            <div>
                <div>
                    <div>
                        <div>{app.properties.displayName}</div>
                        <div className='name'>{app.name}</div>
                    </div>
                    <div className='banner'>{RESX.apps.users}<br />{fetchingCounts ? <BeatLoader size='8px' color={Styles.brightColor} /> : userCounts && userCounts[app.properties.applicationId] ? userCounts[app.properties.applicationId] : '0'}</div>
                </div>
                <div className='field'>
                    <div>{RESX.apps.sku}</div>
                    <div>{app.sku.name}</div>
                </div>
                <div className='field'>
                    <div>Template</div>
                    <div>{app.properties.template}</div>
                </div>
                <div className='field'>
                    <div>Created</div>
                    <div>{new Date(app.properties.createdDate).toString()}</div>
                </div>
                <div className='field'>
                    <div>Hosted</div>
                    <div>{app.location}</div>
                </div>
                <div className='field'>
                    <div>IoT Central ID</div>
                    <div>{app.properties.applicationId}</div>
                </div>
            </div>
            <a href={`https://${appHost}/admin/settings`} rel='noreferrer' target='_blank'>{RESX.apps.cta_label}</a>
        </div>);
    }

    return <div className='apps-page'><div className='app-cards'>{cards}</div></div>
}