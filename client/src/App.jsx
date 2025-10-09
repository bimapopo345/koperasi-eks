import { RouterProvider } from "react-router-dom";
import { useEffect } from "react";
import { router } from "./routes";
import { PersistGate } from "redux-persist/integration/react";
import { persistor } from "./store/store.js";
import { Provider, useDispatch } from "react-redux";
import store from "./store/store.js";
import { login } from "./store/authSlice";
import { getStoredUser, isAuthenticated } from "./api/authApi";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Check if user is already authenticated
    if (isAuthenticated()) {
      const user = getStoredUser();
      if (user) {
        dispatch(login(user));
      }
    }
  }, [dispatch]);

  return (
    <Provider store={store}>
      {/* PersistGate will delay the rendering until the redux state is rehydrated */}
      <PersistGate loading={null} persistor={persistor}>
        <RouterProvider router={router} />
      </PersistGate>
    </Provider>
  );
}

export default App;
