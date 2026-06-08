import AuthLayout from '../../components/auth/AuthLayout.jsx';
import RegisterForm from '../../components/auth/RegisterForm.jsx';

export default function RegisterPage() {
  return (
    <AuthLayout title="Creer un compte" subtitle="Prepare ton profil candidat et ton matching.">
      <RegisterForm />
    </AuthLayout>
  );
}
