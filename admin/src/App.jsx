import React, { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import ChatPage from './pages/ChatPage'
import DatabasesPage from './pages/DatabasesPage'

export default function App() {
  const [currentPage, setCurrentPage] = useState('chat')
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [lang, setLang] = useState('fr')

  const handleNewChat = () => {
    setActiveConversation(null)
  }

  return (
    <div className="flex h-screen bg-dc-bg">
      <Toaster position="top-right" toastOptions={{
        style: { background: '#212121', color: '#ececec', border: '1px solid #2a2a2a' }
      }} />
      
      <Sidebar 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        conversations={conversations}
        setConversations={setConversations}
        activeConversation={activeConversation}
        setActiveConversation={setActiveConversation}
        onNewChat={handleNewChat}
        lang={lang}
        setLang={setLang}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentPage === 'chat' && (
          <ChatPage 
            activeConversation={activeConversation}
            setActiveConversation={setActiveConversation}
            conversations={conversations}
            setConversations={setConversations}
            lang={lang}
          />
        )}
        {currentPage === 'databases' && <DatabasesPage />}
      </main>
    </div>
  )
}
