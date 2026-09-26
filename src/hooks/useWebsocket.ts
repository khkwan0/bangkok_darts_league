import React from 'react'
import config from '@/config'
import {io} from 'socket.io-client'

type JoinStatusType = {
  status: string
}

export const useWebsocket = () => {
  const [room, setRoom] = React.useState('')

  console.log('ugh')
  const socket = React.useMemo(
    () => io('https://' + config.domain, {autoConnect: false}),
    [],
  )

  socket.on('connect', () => {
    console.log('on connected', socket.connected)
    if (room) {
      JoinRoom()
    }
  })

  socket.on('disconnect', () => {
    console.log('disconnected')
  })

  function JoinRoom() {
    if (room) {
      socket.emit('join', room, (joinStatus: JoinStatusType) => {
        if (joinStatus.status === 'ok') {
          console.log('joined OK', room)
          console.log(socket)
        }
      })
    }
  }

  React.useEffect(() => {
    if (room) {
      console.log('connecting to', room, typeof room, room.length)
      socket.connect()
    }
  }, [room])

  const SocketSend = async () => {
    if (socket && socket.connected) {
      const toSend = {}
      socket.emit('matchupdate', toSend)
    }
  }

  const SocketConnect = (_room: string) => {
    setRoom(_room)
  }

  const SocketDisconnect = () => {
    setRoom('')
    socket.disconnect()
  }

  return {SocketSend, SocketDisconnect, SocketConnect}
}
