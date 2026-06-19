import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-center text-xl font-bold">Quản Lý Nhà Trọ</h1>
        <LoginForm />
      </div>
    </main>
  );
}
