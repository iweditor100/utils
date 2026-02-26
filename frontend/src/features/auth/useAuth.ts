import { useAppSelector } from '../../app/hooks';
import {
    selectCurrentUser,
    selectIsAuthenticated,
    selectIsInitialized,
    selectAccessToken,
} from './authSelectors';
import {
    useLoginWithGoogleMutation,
    useLoginWithEmailMutation,
    useRegisterWithEmailMutation,
    useLogoutMutation,
    useVerifyEmailMutation,
    useForgotPasswordMutation,
    useResetPasswordMutation,
    useChangePasswordMutation,
} from './authApi';

export const useAuth = () => {
    // REDUX AUTH STATE
    const user = useAppSelector(selectCurrentUser);
    const accessToken = useAppSelector(selectAccessToken);
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const isInitialized = useAppSelector(selectIsInitialized);

    // MUTATIONS
    const [loginWithGoogle, googleState] = useLoginWithGoogleMutation();
    const [loginWithEmail, emailState] = useLoginWithEmailMutation();
    const [registerWithEmail, registerState] = useRegisterWithEmailMutation();
    const [logout, logoutState] = useLogoutMutation();
    const [verifyEmail, verifyEmailState] = useVerifyEmailMutation();
    const [forgotPassword, forgotPasswordState] = useForgotPasswordMutation();
    const [resetPassword, resetPasswordState] = useResetPasswordMutation();
    const [changePassword, changePasswordState] = useChangePasswordMutation();

    // Derived flags
    const isLoginLoading = googleState.isLoading || emailState.isLoading;
    const isRegisterLoading = registerState.isLoading;
    const isLogoutLoading = logoutState.isLoading;
    const isVerifyEmailLoading = verifyEmailState.isLoading;
    const isForgotPasswordLoading = forgotPasswordState.isLoading;
    const isResetPasswordLoading = resetPasswordState.isLoading;
    const isChangePasswordLoading = changePasswordState.isLoading;

    const authError = googleState.error || emailState.error || registerState.error || null;

    return {
        // Auth state
        user,
        accessToken,
        isAuthenticated,
        isInitialized,

        // Actions
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        verifyEmail,
        forgotPassword,
        resetPassword,
        changePassword,

        // UI helpers
        isLoginLoading,
        isRegisterLoading,
        isLogoutLoading,
        isVerifyEmailLoading,
        isForgotPasswordLoading,
        isResetPasswordLoading,
        isChangePasswordLoading,
        authError,
    };
};
