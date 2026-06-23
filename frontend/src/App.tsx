import { Route, Routes } from 'react-router-dom'
import CodeEditor from './features/editor/CodeEditor'
import FileManager from './features/file-manager/FileManager'
import { EditorShell } from './layouts/EditorShell'
import { AppShell } from './layouts/AppShell'

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
    </Routes>
  )
}
