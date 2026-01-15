export const apiCall = async (currentUser, url, method, body) => {
      if (!currentUser) return null;
      try {
          const token = await currentUser.getIdToken();
          const res = await fetch(url, {
              method: method,
              headers: {
                  'Content-Type': 'application/json',
                  'X-User-ID': currentUser.uid,
                  'Authorization': `Bearer ${token}`
              },
              body: body ? JSON.stringify(body) : undefined
          });
          if (!res.ok) {
               console.error(`API ${method} ${url} failed:`, res.statusText);
               return null;
          }
          if (res.status === 204) return true;
          // Handle empty responses
          const text = await res.text();
          return text ? JSON.parse(text) : true;
      } catch (e) {
          console.error("API Call Error", e);
          return null;
      }
};

export const fetchUserSettings = async (currentUser) => {
    if (!currentUser) return null;
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch('/api/me', {
            headers: { 
                'X-User-ID': currentUser.uid,
                'Authorization': `Bearer ${token}` 
            }
        });
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.error("Cloud load failed", e);
    }
    return null;
};

export const saveUserSettings = async (currentUser, payload) => {
      if (!currentUser) return;
      try {
          const token = await currentUser.getIdToken();
          await fetch('/api/me', {
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/json',
                  'X-User-ID': currentUser.uid,
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ 
                  settings: payload,
                  displayName: currentUser.displayName,
                  avatar: currentUser.photoURL,
                  handle: currentUser.email ? currentUser.email.split('@')[0] : undefined
              })
          });
          console.log("Settings synced to cloud");
      } catch(e) {
          console.error("Cloud save failed", e);
      }
};
