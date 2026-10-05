import { ChangePasswordForm } from './ChangePassword'
import { Frame } from './Login'
import { useStaffAuth } from './auth'

// Shown instead of the dashboard the first time someone signs in with a temp account, and nothing
// else, until they set their own password. There is no way to skip it, only to sign out.
export function SetPassword() {
  const { signOut } = useStaffAuth()
  return (
    <Frame title="Set your password">
      <p className="mt-2 text-soft">This account was created for you with a temporary password. Choose your own before you continue.</p>
      <div className="mt-7">
        <ChangePasswordForm onDone={() => {}} />
      </div>
      <button type="button" className="btn btn-ghost mt-4 w-full" onClick={() => void signOut()}>
        Sign out instead
      </button>
    </Frame>
  )
}
