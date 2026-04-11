import Header from '../components/Layout/Header';
import ProductChart from '../components/Products/ProductChart';
import ProductTable from '../components/Products/ProductTable';

export default function ProductsPage() {
  return (
    <>
      <Header title="Products" />
      <div className="p-6 space-y-6">
        <ProductChart />
        <ProductTable />
      </div>
    </>
  );
}
