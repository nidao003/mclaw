import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from '@/components/layout/Layout';
import RequireAuth from '@/components/auth/RequireAuth';
import Home from '@/pages/Home';
import Experts from '@/pages/Experts';
import ExpertDetail from '@/pages/ExpertDetail';
import SkillsTrending from '@/pages/SkillsTrending';
import Skills from '@/pages/Skills';
import SkillDetail from '@/pages/SkillDetail';
import SkillUpload from '@/pages/SkillUpload';
import MySkills from '@/pages/MySkills';
import Pricing from '@/pages/Pricing';
import ApiDocs from '@/pages/Apis';
import Login from '@/pages/Login';
import Admin from '@/pages/Admin';
import AdminOverview from '@/pages/Admin/Overview';
import AdminSkills from '@/pages/Admin/Skills';
import AdminUsers from '@/pages/Admin/Users';
import AdminModels from '@/pages/Admin/Models';
import ApiKeys from '@/pages/Settings/ApiKeys';
import Settings from '@/pages/Settings';
import Profile from '@/pages/Settings/Profile';
import Account from '@/pages/Settings/Account';
import CloudModels from '@/pages/Settings/Models';

// 路由配置 — MClaw 垂直地铁资源经营 AI 平台官网
export default function App() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<Layout />}>
          <Route element={<RequireAuth />}>
            <Route index element={<Home />} />
            <Route path="experts" element={<Experts />} />
            <Route path="experts/:slug" element={<ExpertDetail />} />
            <Route path="skills/trending" element={<SkillsTrending />} />
            <Route path="skills" element={<Skills />} />
            <Route path="skills/:slug" element={<SkillDetail />} />
            <Route path="apis" element={<ApiDocs />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="settings" element={<Settings />}>
              <Route index element={<Profile />} />
              <Route path="account" element={<Account />} />
              <Route path="api-keys" element={<ApiKeys />} />
              <Route path="models" element={<CloudModels />} />
              <Route path="my-skills" element={<MySkills />} />
              <Route path="upload" element={<SkillUpload />} />
            </Route>
            <Route path="admin" element={<Admin />}>
              <Route index element={<Navigate to="/admin/overview" replace />} />
              <Route path="overview" element={<AdminOverview />} />
              <Route path="skills" element={<AdminSkills />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="models" element={<AdminModels />} />
              <Route path="create" element={<SkillUpload />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </>
  );
}
