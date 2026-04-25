import TableServerWrapper from "./components/TableServerWrapper";
import TableComponent, { Job } from "./components/TableComponent";

const HomePage = async () => {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Jobs</h1>
      <TableServerWrapper>
        {({ data }) => <TableComponent data={data as Job[]} />}
      </TableServerWrapper>
    </div>
  );
};

export default HomePage;
