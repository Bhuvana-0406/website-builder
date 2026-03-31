import { Route, Routes, useLocation } from 'react-router-dom'
import Pricing from './pages/Pricing'
import Projects from './pages/Projects'
import Myprojects from './pages/Myprojects'
import Preview from './pages/Preview'
import Community from './pages/Community'
import Home from './pages/Home'
import View from './pages/View'
import Navbar from './components/Navbar'
import { Toaster} from "@/components/ui/sonner"
import AuthPage from './pages/auth/AuthPage'
import Settings from './pages/Settings'
import Loading from './pages/Loading'
const App = () => {
  const {pathname} = useLocation()
  const hideNavbar = pathname.startsWith('/projects/') && pathname !== '/projects' || pathname.startsWith('/view/') || pathname.startsWith('/preview/') 
  return (
    <div>
      <Toaster />
      {!hideNavbar && <Navbar /> }
      <Routes>
        <Route path='/' element={<Home></Home>} />
        <Route path='/pricing' element={<Pricing></Pricing>} />
        <Route path='/projects/:projectId' element={<Projects></Projects>} />
        <Route path='/projects' element={<Myprojects></Myprojects>} />
        <Route path='/preview/:projectId' element={<Preview></Preview>} />
        <Route path='/preview/:projectId/:versionId' element={<Preview></Preview>} />
        <Route path='/community' element={<Community></Community>} />
        <Route path='/view/:projectId' element={<View></View>} />
        <Route path="/auth/:pathname" element={<AuthPage />} />
        <Route path='/account/settings' element={<Settings />} />
        <Route path='/loading' element={<Loading />} />

      </Routes>
    </div>
  )
}

export default App
