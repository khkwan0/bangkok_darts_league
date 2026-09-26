import React from 'react'

export const useDisclose = props => {
  const [isOpen, setIsOpen] = React.useState(false)

  const onClose = () => setIsOpen(false)
  const onOpen = () => setIsOpen(true)

  return {
    get isOpen() {
      return isOpen
    },
    onClose: () => onClose(),
    onOpen: () => onOpen(),
  }
}
