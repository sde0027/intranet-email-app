import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AppLayout from "../layouts/AppLayout.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import { InboxPage, SentPage, DraftsPage, TrashPage } from "../pages/MailboxPages.jsx";
import ComposePage from "../pages/ComposePage.jsx";
import EmployeesPage from "../pages/EmployeesPage.jsx";
import MessagePage from "../pages/MessagePage.jsx";
import { LoadingState } from "../components/ui.jsx";

function Protected({ children, admin = false }) {
  const { user, checking } = useAuth();
  if (checking) return <LoadingState>Restoring your session…</LoadingState>;
  if (!user) return <Navigate to="/" replace/>;
  if (admin && user.role !== "ADMIN") return <Navigate to="/inbox" replace/>;
  return children;
}
function GuestOnly() {
  const { user, checking } = useAuth();
  if (checking) return <LoadingState>Restoring your session…</LoadingState>;
  return user ? <Navigate to="/inbox" replace/> : <LoginPage/>;
}
export default function App() {
  return <Routes>
    <Route path="/" element={<GuestOnly/>}/>
    <Route element={<Protected><AppLayout/></Protected>}>
      <Route path="/inbox" element={<InboxPage/>}/><Route path="/sent" element={<SentPage/>}/><Route path="/drafts" element={<DraftsPage/>}/><Route path="/trash" element={<TrashPage/>}/><Route path="/compose" element={<ComposePage/>}/><Route path="/message/:id" element={<MessagePage/>}/><Route path="/employees" element={<Protected admin><EmployeesPage/></Protected>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;
}
