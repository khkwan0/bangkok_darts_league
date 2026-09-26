import config from '@/config'
import {useLeagueContext} from '@/context/LeagueContext'
import AsyncStorage from '@react-native-async-storage/async-storage'
// import {socket} from '~/socket'

async function resolveApiDomain(contextApiUrl) {
  try {
    // Prefer persisted URL so cold start does not hit prod while stage is saved.
    const saved = await AsyncStorage.getItem('api_url')
    if (saved && saved.trim()) {
      return saved.replace(/\/$/, '')
    }
  } catch {
    // ignore
  }
  return (contextApiUrl ?? config.apiUrl ?? 'localhost').replace(/\/$/, '')
}

export const useNetwork = () => {
  const {apiUrl} = useLeagueContext()
  const Get = async function (endpoint) {
    try {
      const _endpoint =
        typeof endpoint !== 'undefined' && endpoint[0] === '/'
          ? endpoint.substring(1)
          : endpoint
      const apiDomain = await resolveApiDomain(apiUrl)
      const token = await AsyncStorage.getItem('jwt')
      const res = await fetch(apiDomain + '/' + _endpoint, {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 200) {
        return json
      }
      return {
        status: json.status || 'error',
        error: json.error || 'request_failed',
        httpStatus: res.status,
        ...json,
      }
    } catch (e) {
      console.log('GET ' + endpoint, e)
      return {}
    }
  }

  const Post = async function (endpoint, payload) {
    try {
      const _endpoint =
        typeof endpoint !== 'undefined' && endpoint[0] === '/'
          ? endpoint.substring(1)
          : endpoint
      const apiDomain = await resolveApiDomain(apiUrl)
      const token = await AsyncStorage.getItem('jwt')
      const res = await fetch(apiDomain + '/' + _endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
      })
      const json = await res.json()
      return json
    } catch (e) {
      // console.log('POST ' + endpoint, JSON.stringify(payload, null, 2), e)
      return {status: 'error', error: 'server_error'}
    }
  }

  const Patch = async function (endpoint, payload) {
    try {
      const _endpoint =
        typeof endpoint !== 'undefined' && endpoint[0] === '/'
          ? endpoint.substring(1)
          : endpoint
      const apiDomain = await resolveApiDomain(apiUrl)
      const token = await AsyncStorage.getItem('jwt')
      const res = await fetch(apiDomain + '/' + _endpoint, {
        method: 'PATCH',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
      })
      const json = await res.json()
      return json
    } catch (e) {
      return {status: 'error', error: 'server_error'}
    }
  }

  const Put = async function (endpoint, payload) {
    try {
      const _endpoint =
        typeof endpoint !== 'undefined' && endpoint[0] === '/'
          ? endpoint.substring(1)
          : endpoint
      const apiDomain = await resolveApiDomain(apiUrl)
      const token = await AsyncStorage.getItem('jwt')
      const res = await fetch(apiDomain + '/' + _endpoint, {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
      })
      const json = await res.json()
      return json
    } catch (e) {
      return {status: 'error', error: 'server_error'}
    }
  }

  const Delete = async function (endpoint, payload) {
    try {
      const _endpoint =
        typeof endpoint !== 'undefined' && endpoint[0] === '/'
          ? endpoint.substring(1)
          : endpoint
      const apiDomain = await resolveApiDomain(apiUrl)
      const token = await AsyncStorage.getItem('jwt')
      const res = await fetch(apiDomain + '/' + _endpoint, {
        method: 'DELETE',
        body: payload ? JSON.stringify(payload) : undefined,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
      })
      const json = await res.json()
      return json
    } catch (e) {
      return {status: 'error', error: 'server_error'}
    }
  }

  const SocketSend = (
    type = '',
    matchId = 0,
    data = {},
    dest = '',
    userId,
    nickname,
    socket,
  ) => {
    const user = {
      id: userId,
      nickname: nickname,
    }
    const toSend = {
      type: type,
      matchId: matchId,
      timestamp: Date.now(),
      playerId: user.id ?? 0,
      nickname: user.nickname,
      dest: dest,
      data: {...data},
    }
    if (socket && socket.connected) {
      socket.emit('matchupdate', toSend)
    }
  }
  return {Get, Post, Put, Patch, Delete, SocketSend}
}
