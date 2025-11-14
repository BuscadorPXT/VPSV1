import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PriceCell } from "@/components/PriceCell";
import { FavoriteButton } from "@/components/FavoriteButton";
import { MiniPriceSparkline } from "@/components/PriceSparkline";

interface Product {
  id: number;
  model: string;
  storage: string;
  color: string;
  category: string;
  price: string;
  isLowestPrice: boolean;
  supplier: { name: string };
}

interface EnhancedProductTableProps {
  products: Product[];
  onSort: (field: string) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  getProductKey: (product: Product) => string;
  getPricePoints: (key: string) => any[];
  isLoading: boolean;
}

export function EnhancedProductTable({ 
  products, 
  onSort, 
  sortField, 
  sortDirection,
  getProductKey,
  getPricePoints,
  isLoading 
}: EnhancedProductTableProps) {
  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Storage</TableHead>
          <TableHead>Color</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Supplier</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{product.category}</Badge>
                <span className="font-medium">{product.model}</span>
              </div>
            </TableCell>
            <TableCell>{product.storage}</TableCell>
            <TableCell>{product.color}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <PriceCell 
                  price={product.price}
                  className={product.isLowestPrice ? 'text-green-600' : ''}
                />
                <MiniPriceSparkline
                  priceHistory={getPricePoints(getProductKey(product))}
                  currentPrice={parseFloat(product.price)}
                />
              </div>
            </TableCell>
            <TableCell>{product.supplier.name}</TableCell>
            <TableCell>
              <FavoriteButton productId={product.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}