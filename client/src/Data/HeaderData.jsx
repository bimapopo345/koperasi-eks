const HeaderData = {
  topHeader: {
    logo: "https://png.pngtree.com/png-clipart/20230819/original/pngtree-random-dice-icon-isometric-vector-picture-image_8043755.png",
    appName: "Koperasi",
  },

  //

  sideHeader: {
    navItems: [
      { name: "Home", slug: "/", active: true },
      { name: "Learn More", slug: "#", active: true },
      { name: "About", slug: "#", active: true },
      { name: "How to Use", slug: "#", active: true },
    ],
    authItems: (authStatus) => [
      { name: "Support", slug: "#", active: true },
      { name: "Login", slug: "/login", active: !authStatus },
      {
        name: "Logout",
        slug: "/logout",
        active: authStatus,
        component: <button>Logout</button>, // Replace with your actual Logout button component
      },
    ],
  },
};

export default HeaderData;
