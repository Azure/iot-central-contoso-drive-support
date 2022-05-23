import './subauthenticated.css';
import { RESX } from '../../strings'
import { Styles } from '../../shared/styles';
import { AuthContext } from '../../context/authContext';
import usePromise from '../../hooks/usePromise';
import BeatLoader from 'react-spinners/BeatLoader';

import React from 'react';

/* API */

function subscriptionsList(authContext: any) {
    return new Promise((resolve, reject) => {
        authContext.getSubscriptionSelectorList()
            .then((res) => { resolve(res); })
            .catch((error) => { reject(error); });
    });
}

function setSubscription(authContext: any, sub: any) {
    return new Promise((resolve, reject) => {
        authContext.selectSubscription(sub)
            .then((res) => { resolve(res); })
            .catch((error) => { reject(error); });
    });
}

/* UX */

function Page({ authContext, loadingSubs, loadingSub, subscriptions, setSubscription }) {

    return <div className='subauth-page'>
        <h1>{RESX.app.title}</h1>
        <h2>{RESX.app.subtitle}</h2>

        {authContext.authenticated && !authContext.subscription ?
            <>
                <div className='subs'>
                    <h3>{RESX.subauth.subtitle}</h3>
                    <div className='subscriptions'>
                        {subscriptions && subscriptions.map((element) => {
                            return (<button key={element.subscription.displayName} className='subscription-button' onClick={() => { setSubscription(element) }}>
                                <div className='subscription-selector'>
                                    <div>{element.directory.displayName}</div>
                                    <div>{element.subscription.displayName}</div>
                                    <div>{element.subscription.subscriptionId}</div>
                                    <div>
                                        {element.apps.map((element2) => {
                                            return <div key={element2.properties.displayName}>{element2.properties.displayName}</div>
                                        })}
                                    </div>
                                </div>
                            </button>)
                        })}
                    </div>
                </div>

                <div style={{ height: '6rem' }}>
                    {loadingSub ?
                        <div className='loader'><label>{RESX.app.fetching}</label><BeatLoader size='16px' color={Styles.brightColor} /></div>
                        :
                        <div className='signout'>
                            <span>{RESX.subauth.footnote}</span><br /><br />
                            <button onClick={() => { authContext.signOut(); }} className='btn btn-secondary'>{RESX.subauth.signOut} {authContext.loginAccount.idTokenClaims.preferred_username}</button>
                        </div>}
                </div>
            </>
            :
            loadingSubs ?
                <div className='loader'><label>{RESX.app.fetching}</label><BeatLoader size='16px' color={Styles.brightColor} /></div>
                :
                <div className='login'>
                    <button onClick={() => { authContext.signIn(false); }} className='btn btn-primary'>{RESX.app.signIn}</button>
                </div>
        }
    </div>
}

/* Render */

export default function Subauthenticated() {
    const authContext: any = React.useContext(AuthContext);    
    const [selectedSub, setSelectedSub] = React.useState(null);
    const [loadingSubList, subList, , loadSubList] = usePromise({ promiseFn: () => subscriptionsList(authContext) });
    const [loadingSub, , , loadSub] = usePromise({ promiseFn: () => setSubscription(authContext, selectedSub) });

    // eslint-disable-next-line
    React.useEffect(() => { loadSubList(); }, [authContext.authenticated]);

    // eslint-disable-next-line
    React.useEffect(() => { if (!selectedSub) { return; } loadSub(); }, [selectedSub]);
    
    return <Page authContext={authContext} loadingSubs={loadingSubList} loadingSub={loadingSub} subscriptions={subList} setSubscription={setSelectedSub} />
}