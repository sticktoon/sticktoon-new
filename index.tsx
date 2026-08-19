import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./index.css";


const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root not found");

const googleClientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "1049182842994-ck7f4tdfou808vi856a5u43b5tb28nba.apps.googleusercontent.com";

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
