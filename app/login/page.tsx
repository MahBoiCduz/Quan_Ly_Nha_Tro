import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="card w-full max-w-sm p-8">
        <h1 className="mb-1 text-center text-2xl font-semibold text-ink">Quản Lý Nhà Trọ</h1>
        <p className="mb-6 text-center text-sm text-muted">Đăng nhập để tiếp tục</p>
        <LoginForm />
      </div>
    </main>
  );
}
