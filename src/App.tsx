import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Signup2 from './pages/Signup2';
import FindCredentials from './pages/FindCredentials';
import OAuth2RedirectHandler from './pages/OAuth2RedirectHandler';
import SocialSignupPage from './pages/SocialSignupPage';
import MyPage from './pages/MyPage';
import EditProfilePage from './pages/EditProfilePage';
import AnalysisResultPage from './pages/AnalysisResultPage';
import Dashboard from './pages/Dashboard';
import PhotoUpload from './pages/PhotoUpload';
import ExerciseListPage from './pages/ExerciseListPage';
import RoutineCreatePage from './pages/RoutineCreatePage';
import RoutineDetailPage from './pages/RoutineDetailPage';
import RoutineEditPage from './pages/RoutineEditPage';
import ExerciseDetailPage from './pages/ExerciseDetailPage';
import PhotoUploadLoading from './pages/PhotoUploadLoading';
import CommunityPage from './pages/CommunityPage';
import CommunityDetailPage from './pages/CommunityDetailPage';
import CommunityWritePage from './pages/CommunityWritePage';
import LogPage from './pages/log';

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signup2" element={<Signup2 />} />
        <Route path="/find-credentials" element={<FindCredentials />} />
        <Route path="/oauth/redirect" element={<OAuth2RedirectHandler />} />
        <Route path="/social-signup" element={<SocialSignupPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/mypage/edit" element={<EditProfilePage />} />
        <Route path="/analysis-result/:historyId" element={<AnalysisResultPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/log" element={<LogPage />} />
        <Route path="/photoupload" element={<PhotoUpload />} />
        <Route path="/exercises" element={<ExerciseListPage />} />
        <Route path="/routines/new" element={<RoutineCreatePage />} />
        <Route path="/routines/:routineId" element={<RoutineDetailPage />} />
        <Route path="/routines/edit/:routineId" element={<RoutineEditPage />} />
        <Route path="/exercises/:exerciseId" element={<ExerciseDetailPage />} />
        <Route path="/photoanalysis-loading" element={<PhotoUploadLoading />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/:id" element={<CommunityDetailPage />} />
        <Route path="/community/write" element={<CommunityWritePage />} />
        <Route path="/community/edit/:id" element={<CommunityWritePage />} />
      </Routes>

      {/* Toast 알림을 위한 Toaster 컴포넌트 */}
      <Toaster 
        position="top-center" 
        richColors 
        closeButton 
        expand={true}
      />
    </>
  )
}

export default App;