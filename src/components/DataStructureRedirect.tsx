import { Navigate, useParams } from "react-router-dom";

const DataStructureRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  const target = slug ? `/problems/implement-${slug}` : "/problems";
  return <Navigate to={target} replace />;
};

export default DataStructureRedirect;

