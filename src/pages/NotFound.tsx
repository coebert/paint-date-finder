import { Helmet } from "react-helmet-async";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Helmet>
        <title>Page not found (404) | Find A Walk-On</title>
        <meta
          name="description"
          content="The page you're looking for doesn't exist on Find A Walk-On. Head back to the homepage to browse UK paintball walk-on events and teams."
        />
        <meta name="robots" content="noindex,follow" />
      </Helmet>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
