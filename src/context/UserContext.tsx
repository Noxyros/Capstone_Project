'use client'

import React, { createContext, useContext, useState } from 'react'

interface UserContextType {
  gems: number
  hearts: number
  streak: number
  freezesEquipped: number
  setHearts: React.Dispatch<React.SetStateAction<number>>
  buyItem: (cost: number, action: () => void) => boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Starting values (These will eventually come from your database)
  const [gems, setGems] = useState(500) 
  const [hearts, setHearts] = useState(3)
  const [streak, setStreak] = useState(12)
  const [freezesEquipped, setFreezesEquipped] = useState(1)

  // Universal purchase handler
  const buyItem = (cost: number, action: () => void) => {
    if (gems >= cost) {
      setGems((prev) => prev - cost)
      action()
      return true
    }
    return false
  }

  return (
    <UserContext.Provider value={{ gems, hearts, streak, freezesEquipped, setHearts, buyItem }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) throw new Error('useUser must be used within a UserProvider')
  return context
}