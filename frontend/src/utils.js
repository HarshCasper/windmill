/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { toast } from '@zerodevx/svelte-toast';
import { CancelablePromise, UserService } from './gen';
import { superadmin, userStore, workspaceStore } from './stores';
import { get } from 'svelte/store';
import { goto } from '$app/navigation';
export function isToday(someDate) {
    const today = new Date();
    return (someDate.getDate() == today.getDate() &&
        someDate.getMonth() == today.getMonth() &&
        someDate.getFullYear() == today.getFullYear());
}
export function daysAgo(someDate) {
    const today = new Date();
    return Math.floor((today.getTime() - someDate.getTime()) / 86400000);
}
export function secondsAgo(date) {
    return Math.floor((new Date().getTime() - date.getTime()) / 1000);
}
export function displayDaysAgo(dateString) {
    const date = new Date(dateString);
    const nbSecondsAgo = secondsAgo(date);
    if (nbSecondsAgo < 600) {
        return `${nbSecondsAgo}s ago`;
    }
    else if (isToday(date)) {
        return `today at ${date.toLocaleTimeString()}`;
    }
    else if (daysAgo(date) === 0) {
        return `${daysAgo(date) + 1} day ago`;
    }
    else {
        return `${daysAgo(date) + 1} day ago`;
    }
}
export function displayDate(dateString) {
    const date = new Date(dateString ?? '');
    if (date.toString() === 'Invalid Date') {
        return '';
    }
    else {
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} at ${date.toLocaleTimeString()}`;
    }
}
export function getToday() {
    var today = new Date();
    return today;
}
export function sendUserToast(message, error = false) {
    if (error) {
        toast.push(message, {
            theme: {
                '--toastBackground': '#FEE2E2',
                '--toastBarBackground': '#FEE2E2'
            }
        });
    }
    else
        toast.push(message);
}
export function truncateHash(hash) {
    if (hash.length >= 6) {
        return hash.substr(hash.length - 6);
    }
    else {
        return hash;
    }
}
async function loadStore(workspace) {
    try {
        const user = await UserService.whoami({ workspace });
        const nuser = {
            username: user.username,
            email: user.email,
            created_at: user.created_at,
            is_admin: user.is_admin,
            groups: user.groups,
            pgroups: user.groups.map((x) => `g/${x}`)
        };
        userStore.set(nuser);
        return nuser;
    }
    catch (error) {
        userStore.set(undefined);
        return undefined;
    }
}
export async function getUser(workspace) {
    const user = get(userStore);
    if (user === undefined) {
        return loadStore(workspace);
    }
    else {
        return user;
    }
}
export function logoutWithRedirect(rd) {
    const error = encodeURIComponent('You have been logged out because your session has expired.');
    goto(`/user/login?error=${error}${rd ? '&rd=' + encodeURIComponent(rd) : ''}`);
}
export async function handle401(promise, rd) {
    // Redirects to login if the `promise` returns a 401 due to lack of authentication
    // Optionnally provide `rd`, to which the user will be redirected after logging back in
    return promise.catch(async (error) => {
        if (error.status === 401) {
            if (getUser(get(workspaceStore)) === undefined) {
                logoutWithRedirect(rd);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return null;
            }
            else {
                throw Error('You do not have enough privilege to access this');
            }
        }
        else {
            throw error;
        }
    });
}
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function validatePassword(password) {
    const re = /^(?=.*[\d])(?=.*[!@#$%^&*])[\w!@#$%^&*]{8,30}$/;
    return re.test(password);
}
export async function logout(logoutMessage) {
    try {
        superadmin.set(undefined);
        goto(`/user/login${logoutMessage ? '?error=' + encodeURIComponent(logoutMessage) : ''}`);
        await UserService.logout();
        sendUserToast('you have been logged out');
    }
    catch (error) {
        goto(`/user/login?error=${encodeURIComponent('There was a problem logging you out, check the logs')}`);
        console.error(error);
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function clickOutside(node) {
    const handleClick = (event) => {
        if (node && !node.contains(event.target) && !event.defaultPrevented) {
            node.dispatchEvent(new CustomEvent('click_outside', node));
        }
    };
    document.addEventListener('click', handleClick, true);
    return {
        destroy() {
            document.removeEventListener('click', handleClick, true);
        }
    };
}
export function emptySchema() {
    return {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        properties: {},
        required: [],
        type: 'object'
    };
}
export function simpleSchema() {
    return {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
            name: {
                description: 'The name to hello world to',
                type: 'string'
            }
        },
        required: []
    };
}
export function removeItemAll(arr, value) {
    var i = 0;
    while (i < arr.length) {
        if (arr[i] === value) {
            arr.splice(i, 1);
        }
        else {
            ++i;
        }
    }
    return arr;
}
export function canWrite(path, extra_perms, user) {
    let keys = Object.keys(extra_perms);
    if (!user) {
        return false;
    }
    if (user.is_admin) {
        return true;
    }
    let userOwner = `u/${user.username}`;
    if (path.startsWith(userOwner)) {
        return true;
    }
    if (keys.includes(userOwner) && extra_perms[userOwner]) {
        return true;
    }
    if (user.pgroups.findIndex((x) => path.startsWith(x) || (keys.includes(x) && extra_perms[x])) != -1) {
        return true;
    }
    return false;
}
export function removeKeysWithEmptyValues(obj) {
    Object.keys(obj).forEach((key) => (obj[key] === undefined ? delete obj[key] : {}));
}
export function allTrue(dict) {
    for (let v of Object.values(dict)) {
        if (!v)
            return false;
    }
    return true;
}
export function forLater(scheduledString) {
    return new Date() < new Date(scheduledString);
}
export function elapsedSinceSecs(date) {
    return Math.round((new Date().getTime() - new Date(date).getTime()) / 1000);
}
export function groupBy(scripts, toGroup, dflts = []) {
    let r = {};
    for (const dflt of dflts) {
        r[dflt] = [];
    }
    scripts.forEach((sc) => {
        let section = toGroup(sc);
        if (section in r) {
            r[section].push(sc);
        }
        else {
            r[section] = [sc];
        }
    });
    return Object.entries(r).sort((s1, s2) => {
        let n1 = s1[0];
        let n2 = s2[0];
        if (n1 > n2) {
            return 1;
        }
        else if (n1 < n2) {
            return -1;
        }
        else {
            return 0;
        }
    });
}
export function truncate(s, n, suffix = '...') {
    if (s.length <= n) {
        return s;
    }
    else {
        return s.substring(0, n) + suffix;
    }
}
export function truncateRev(s, n, prefix = '...') {
    if (s.length <= n) {
        return s;
    }
    else {
        return prefix + s.substring(s.length - n, s.length);
    }
}
//# sourceMappingURL=utils.js.map