import { useEffect, useState } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

function App() {
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState(null)

  const loadNotes = async () => {
    try {
      const res = await fetch(`${API}/notes`)
      const data = await res.json()
      setNotes(data)
    } catch (e) {
      setError('Failed to load notes')
    }
  }

  useEffect(() => { loadNotes() }, [])

  const addNote = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    const res = await fetch(`${API}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    })
    if (res.ok) {
      setTitle('')
      setContent('')
      loadNotes()
    }
  }

  const removeNote = async (id) => {
    await fetch(`${API}/notes/${id}`, { method: 'DELETE' })
    loadNotes()
  }

  return (
    <main className="app">
      <h1>NoteDeck</h1>

      <form className="note-form" onSubmit={addNote}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Write your note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
        <button type="submit">Add note</button>
      </form>

      {error && <p className="error">{error}</p>}

      <ul className="note-list">
        {notes.map((n) => (
          <li key={n.id} className="note">
            <div className="note-header">
              <h3>{n.title}</h3>
              <button onClick={() => removeNote(n.id)}>Delete</button>
            </div>
            {n.content && <p>{n.content}</p>}
          </li>
        ))}
        {notes.length === 0 && <p className="empty">No notes yet.</p>}
      </ul>
    </main>
  )
}

export default App
