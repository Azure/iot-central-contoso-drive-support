import { Config } from '../config'
import { MsalAuthService } from '@microsoft/iot-cardboard-js'

import * as msal from '@azure/msal-browser';
import axios from 'axios';

import * as React from 'react';

function getAccessTokenForScope(silentFail: boolean, msalInstance: any, scope: any, options: any) {
  const tokenRequest: any = Object.assign({}, options, {
    scopes: Array.isArray(scope) ? scope : [scope],
    forceRefresh: false,
    redirectUri: MsalConfig.auth.redirectUri
  });

  return new Promise((resolve, reject) => {
    msalInstance.acquireTokenSilent(tokenRequest)
      .then((res) => {
        resolve(res)
      })
      .catch((err) => {
        if (silentFail) {
          reject(err);
          return;
        }
        msalInstance.acquireTokenPopup(tokenRequest)
          .then((res) => {
            resolve(res)
          })
          .catch((err) => {
            if (err.name === 'BrowserAuthError') {
              msalInstance.acquireTokenPopup(tokenRequest)
                .then((res) => {
                  resolve(res)
                })
                .catch((err) => {
                  reject(err);
                })

            } else {
              reject(err);
            }
          });
      });
  });
}

function getCentralData(apps: Array<any>, accessToken: string) {
  return new Promise(async (resolve, reject) => {
    const templatesMap = {};
    const validTemplates: Array<string> = [];
    const validApps: Array<any> = [];
    for (const appIndex in apps) {
      const appId = apps[appIndex].properties.applicationId;
      try {
        const res: any = await axios.get(`https://${appId}${Config.AppDNS}/api/deviceTemplates?api-version=${Config.APIVersion}`, { headers: { Authorization: 'Bearer ' + accessToken } })
        for (const templateIndex in res.data.value) {
          if (res.data.value[templateIndex].displayName === Config.template) {
            validApps.push(appId);
            validTemplates.push(res.data.value[templateIndex].id)
            templatesMap[appId] = res.data.value[templateIndex].id;
            break;
          }
        }
      } catch (err) {
        console.log("Skipping app: " + appId);
      }
    }
    if (validTemplates.length > 0) {
      resolve({ templatesMap, validTemplates, validApps });
    } else {
      reject(Config.template + ' not found in any application')
    }
  })
}

function getSubscriptionsARM(accessToken: string) {
  return new Promise(async (resolve, reject) => {
    axios.get(`https://management.azure.com/subscriptions?api-version=2020-01-01`, {
      headers: {
        Authorization: 'Bearer ' + accessToken
      }
    })
      .then((res) => {
        resolve(res.data.value);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function getCentralApplicationsARM(accessToken: string, subscriptionId: string) {
  return new Promise(async (resolve, reject) => {
    axios.get(`https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.IoTCentral/IoTApps?api-version=2018-09-01`, {
      headers: {
        Authorization: 'Bearer ' + accessToken
      }
    })
      .then((res) => {
        resolve(res.data.value);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function getTenantsARM(accessToken: string) {
  return new Promise(async (resolve, reject) => {
    axios.get(`https://management.azure.com/tenants?api-version=2020-01-01`, {
      headers: {
        Authorization: 'Bearer ' + accessToken
      }
    })
      .then((res) => {
        resolve(res.data.value);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

export const MsalConfig = {
  auth: {
    clientId: Config.AADClientID,
    authority: Config.AADLoginServer + '/' + Config.AADDirectoryID,
    redirectUri: Config.AADRedirectURI
  },
  cache: {
    cacheLocation: 'localStorage'
  }
}

export const Scopes = {
  Graph: ['User.Read', 'User.Invite.All', 'User.ReadWrite.All', 'Directory.ReadWrite.All'],
  Central: 'https://apps.azureiotcentral.com/user_impersonation',
  ARM: 'https://management.azure.com/user_impersonation'
}

export const AuthContext = React.createContext({});

export class AuthProvider extends React.PureComponent {

  private msalInstance: any = null;

  constructor(props: any) {
    super(props);
    this.msalInstance = new msal.PublicClientApplication(MsalConfig);
  }

  signIn = (silent: boolean) => {

    if (this.state.authenticated) { return; }

    let loginAccount: any = {};
    let loginTenants: any = [];
    let loginSubscriptions: any = [];

    let armToken: any = {};

    // Making this a promise chain is intentional as success will mutate state and cosumers will rerender
    this.msalInstance.handleRedirectPromise()
      .then((res: any) => {
        loginAccount = res ? res.data.value[0] : this.msalInstance.getAllAccounts()[0];
        return getAccessTokenForScope(silent, this.msalInstance, Scopes.Graph, { account: loginAccount });
      })
      .then((res: any) => {
        loginAccount = res.account;
        return getAccessTokenForScope(silent, this.msalInstance, Scopes.ARM, { account: loginAccount });
      })
      .then((res: any) => {
        armToken = res;
        return getTenantsARM(armToken.accessToken);
      })
      .then((res: any) => {
        loginTenants = res;
        return getSubscriptionsARM(armToken.accessToken);
      })
      .then((res: any) => {
        loginSubscriptions = res;
        return getAccessTokenForScope(silent, this.msalInstance, Scopes.Central, { account: loginAccount });
      })
      .then(() => {
        const sharableAuthInstance = new MsalAuthService({
          authority: Config.AADLoginServer + '/' + Config.AADDirectoryID,
          clientId: Config.AADClientID,
          scope: 'https://apps.azureiotcentral.com/user_impersonation',
          redirectUri: Config.AADRedirectURI,
        })

        this.setState({
          authenticated: true,
          loginAccount,
          loginTenants,
          loginSubscriptions,
          sharableAuthInstance
        })
      })
      .catch((err) => {
        console.log(err);
        console.log('Silent auth failed. User must sign in');
      });
  }

  selectSubscription = async (subscription: any) => {

    let cachedApps, cachedFilter: any = null;
    try {
      cachedApps = localStorage.getItem('cachedState');
      cachedFilter = localStorage.getItem('cachedFilter');
    } catch { };

    if (Config.cacheApps && cachedApps !== null && cachedApps !== '') {
      const newState: any = JSON.parse(cachedApps);
      if (cachedFilter !== null && cachedFilter !== '') { newState.filteredApps = JSON.parse(cachedFilter) }
      this.setState(newState);
      return;
    }

    const apps = Object.assign({}, subscription.apps);
    const centralToken: any = await getAccessTokenForScope(true, this.msalInstance, Scopes.Central, { account: this.state.loginAccount });
    const central: any = await getCentralData(apps, centralToken.accessToken)

    const state = {
      subscription: true,
      activeSubscription: subscription,
      centralApps: central.validApps,
      filteredApps: Config.cacheApps && cachedFilter !== null && cachedFilter !== '' ? JSON.parse(cachedFilter) : central.validApps,
      filteredAppsTemplates: central.templatesMap,
      validTemplates: central.validTemplates
    }

    setTimeout(() => {
      localStorage.setItem('cachedState', JSON.stringify(state));
    }, 1000);

    this.setState(state);
  }

  setAppsFilter = (appId: string) => {
    const reFilter = this.state.filteredApps.slice();

    const index = reFilter.indexOf(appId);
    if (index > -1) { reFilter.splice(index, 1); }
    else { reFilter.push(appId); }

    setTimeout(() => {
      localStorage.setItem('cachedFilter', JSON.stringify(reFilter));
    }, 1000);

    this.setState({
      filteredApps: reFilter
    })
  }

  getCentralAccessToken = async () => {
    const res: any = await getAccessTokenForScope(true, this.msalInstance, Scopes.Central, { account: this.state.loginAccount });
    return res.accessToken;
  }

  getARMAccessToken = async () => {
    const res: any = await getAccessTokenForScope(true, this.msalInstance, Scopes.ARM, { account: this.state.loginAccount });
    return res.accessToken;
  }

  getGraphAccessToken = async () => {
    const res: any = await getAccessTokenForScope(true, this.msalInstance, Scopes.Graph, { account: this.state.loginAccount });
    return res.accessToken;
  }

  // This list is contains the full list of apps per subscription
  getSubscriptionSelectorList = async () => {
    const subs: Array<any> = [];
    if (this.state.authenticated) {
      const directories = {};
      for (const i in this.state.loginTenants) {
        directories[this.state.loginTenants[i].tenantId] = this.state.loginTenants[i];
      }

      for (const i in this.state.loginSubscriptions) {
        const subscription = this.state.loginSubscriptions[i];
        const directory = directories[subscription.tenantId];
        try {
          const armToken: any = await getAccessTokenForScope(true, this.msalInstance, Scopes.ARM, { account: this.state.loginAccount });
          const apps = await getCentralApplicationsARM(armToken.accessToken, subscription.subscriptionId);
          subs.push({ directory, subscription, apps });
        } catch { console.log('no perms') }
      };
    }
    return subs;
  }

  signOut = () => {
    this.msalInstance.logout({ account: this.state.loginAccount });
  }

  state: any = {
    authenticated: false,
    subscription: false,
    centralApps: [],
    filteredApps: [],
    filteredAppsTemplates: {},
    loginAccount: {},
    loginTenants: {},
    loginSubscriptions: [],
    activeSubscription: {},
    sharableAuthInstance: null,
    signIn: this.signIn,
    signOut: this.signOut,
    getCentralAccessToken: this.getCentralAccessToken,
    getARMAccessToken: this.getARMAccessToken,
    getGraphAccessToken: this.getGraphAccessToken,
    selectSubscription: this.selectSubscription,
    getSubscriptionSelectorList: this.getSubscriptionSelectorList,
    setAppsFilter: this.setAppsFilter
  }

  render() {
    return (
      <AuthContext.Provider value={this.state}>
        { this.props.children}
      </AuthContext.Provider>
    )
  }
}
