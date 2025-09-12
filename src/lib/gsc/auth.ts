import { supabase } from "@/integrations/supabase/client";

// Load from environment variables
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

export const handleGoogleCallback = async (code: string) => {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to exchange code for tokens");
    }

    const data = await response.json();

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + data.expires_in);

    // Store tokens in Supabase
    const { error } = await supabase
      .from("gsc_oauth_credentials")
      .upsert(
        {
          user_id: (await supabase.auth.getUser()).data.user?.id,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expiry_date: expiryDate.toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error handling OAuth callback:", error);
    return false;
  }
};

export const getGscToken = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: credentials, error } = await supabase
      .from("gsc_oauth_credentials")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !credentials) return null;

    // Check if token needs refresh
    const expiryDate = new Date(credentials.expiry_date);
    if (expiryDate <= new Date()) {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          refresh_token: credentials.refresh_token,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "refresh_token",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      const data = await response.json();

      // Calculate new expiry date
      const newExpiryDate = new Date();
      newExpiryDate.setSeconds(newExpiryDate.getSeconds() + data.expires_in);

      const { error: updateError } = await supabase
        .from("gsc_oauth_credentials")
        .update({
          access_token: data.access_token,
          expiry_date: newExpiryDate.toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      return data.access_token;
    }

    return credentials.access_token;
  } catch (error) {
    console.error("Error getting GSC token:", error);
    return null;
  }
};

export const getGoogleOAuthCode = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("code");
};
