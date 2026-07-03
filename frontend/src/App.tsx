import { Route, Routes } from 'react-router-dom'
import CodeEditor from './features/editor/CodeEditor'
import FileManager from './features/file-manager/FileManager'
import { AuthSessionRegistrar } from './features/user/components/AuthSessionRegistrar'
import { RequireAuth } from './features/user/components/RequireAuth'
import { RequireGuest } from './features/user/components/RequireGuest'
import LoginPage from './features/user/LoginPage'
import { EditorShell } from './layouts/EditorShell'
import { AppShell } from './layouts/AppShell'
import { LoginShell } from './layouts/LoginShell'

export default function App() {
  return (
    <>
      <AuthSessionRegistrar />
      <Routes>
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<FileManager />} />
          </Route>
          <Route element={<EditorShell />}>
            <Route path="/editor" element={<CodeEditor />} />
          </Route>
        </Route>
        <Route element={<RequireGuest />}>
          <Route element={<LoginShell />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  )
}
