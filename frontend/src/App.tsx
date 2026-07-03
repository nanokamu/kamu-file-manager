import { Route, Routes } from 'react-router-dom'
import CodeEditor from './features/editor/CodeEditor'
import FileManager from './features/file-manager/FileManager'
import LoginPage from './features/user/LoginPage'
import { EditorShell } from './layouts/EditorShell'
import { AppShell } from './layouts/AppShell'
import { LoginShell } from './layouts/LoginShell'

export default function App() {
  return (
    // <Routes>
    //   <Route path="/" element={<FileManager />} />
    //   <Route path="/editor" element={<CodeEditor />} />
    // </Routes>
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<FileManager />} />
      </Route>
      <Route element={<EditorShell />}>
        <Route path="/editor" element={<CodeEditor />} />
      </Route>
      <Route element={<LoginShell />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
    </Routes>
  )
}
