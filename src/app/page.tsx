import TableServerWrapper from "./components/TableServerWrapper";
import TableComponent, { Job } from "./components/TableComponent";

const HomePage = async () => {
  return (
    <TableServerWrapper>
      {({ data }) => <TableComponent data={data as Job[]} />}
    </TableServerWrapper>
  );
};

export default HomePage;
