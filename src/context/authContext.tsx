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

function getCentralTemplates(apps: Array<any>, accessToken: string) {
  return new Promise(async (resolve, reject) => {
    var axiosGets = apps.map((app) => {
      return axios.get(`https://${app}${Config.AppDNS}/api/preview/deviceTemplates`, {
        headers: {
          Authorization: 'Bearer ' + accessToken
        }
      });
    });

    axios.all(axiosGets)
      .then((res: any) => {
        const templatesMap = {};
        const validTemplates: Array<string> = [];

        for (const resIndex in res) {
          for (let i = 0; i < res[resIndex].data.value.length; i++) {
            if (res[resIndex].data.value[i].displayName === Config.template) {
              templatesMap[apps[resIndex]] = res[resIndex].data.value[i].id;
              validTemplates.push(res[resIndex].data.value[i].id);
              break;
            }
          }
        }
        resolve({ templatesMap, validTemplates });
      })
      .catch((err) => {
        reject(err);
      });
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

    let cachedApps, cachedFilter = null;
    try {
      cachedApps = JSON.parse(localStorage.getItem('cachedState') as string);
      cachedFilter = JSON.parse(localStorage.getItem('cachedFilter') as string);
    } catch { };

    if (Config.cacheAppDevices) {
      if (cachedApps) {
        if (Config.cacheAppFilters && cachedFilter) { cachedApps.filteredApps = cachedFilter; }
        this.setState(cachedApps);
        return;
      }
    }

    let filtered: Array<string> = [];
    if (Config.cacheAppFilters && cachedFilter) {
      filtered = cachedFilter;
    }
    else {
      for (const app in subscription.apps) {
        filtered.push(subscription.apps[app].properties.applicationId);
      }
    }

    const centralToken: any = await getAccessTokenForScope(true, this.msalInstance, Scopes.Central, { account: this.state.loginAccount });
    const templates: any = await getCentralTemplates(filtered, centralToken.accessToken)

    const state = {
      subscription: true,
      activeSubscription: subscription,
      filteredApps: filtered,
      filteredAppsTemplates: templates.templatesMap,
      validTemplates: templates.validTemplates
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

  getSubcriptionSelectorList = async () => {
    const subs: Array<any> = [];
    if (this.state.authenticated) {
      const directories = {};
      for (const i in this.state.loginTenants) {
        directories[this.state.loginTenants[i].tenantId] = this.state.loginTenants[i];
      }

      for (const i in this.state.loginSubscriptions) {
        const sub = this.state.loginSubscriptions[i];
        const directory = directories[sub.tenantId];
        const armToken: any = await getAccessTokenForScope(true, this.msalInstance, Scopes.ARM, { account: this.state.loginAccount });
        const apps = await getCentralApplicationsARM(armToken.accessToken, sub.subscriptionId);
        subs.push({ directory, subscription: sub, apps });
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
    getSubcriptionSelectorList: this.getSubcriptionSelectorList,
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
