/**
 * Type declaration for the runtime Amplify config loaded via <script> tag.
 */
declare global {
    interface Window {
        amplifyConfig?: {
            appEnv: string;
            Auth: {
                Cognito: {
                    region: string;
                    userPoolId: string;
                    userPoolClientId: string;
                    context: string;
                    loginWith: {
                        oauth: {
                            domain: string;
                            scopes: string[];
                            redirectSignIn: string[];
                            redirectSignOut: string[];
                            responseType: 'code' | 'token';
                        };
                    };
                };
            };
        };
    }
}

/**
 * This function dynamically configures the Amplify library based on the
 * current environment (development vs. deployed). It ensures that OAuth
 * redirects for sign-in and sign-out point to the correct URL, preventing
 * redirect loops between the local dev server and the deployed application.
 *
 * @returns The configured Amplify settings object.
 */
export const getAmplifyConfig = () => {
    // Read runtime config from window (loaded via <script> tag in index.html)
    const config = window.amplifyConfig;
    if (!config) {
        throw new Error(
            'Amplify config not found. Ensure amplify-config.js is loaded before the app.'
        );
    }

    // Create a deep copy of the configuration to avoid direct mutation.
    const newConfig = JSON.parse(JSON.stringify(config));

    console.log('Using runtime Amplify configuration.', {
        redirectSignIn: newConfig.Auth?.Cognito?.loginWith?.oauth?.redirectSignIn,
        redirectSignOut: newConfig.Auth?.Cognito?.loginWith?.oauth?.redirectSignOut,
    });

    return newConfig;
};
