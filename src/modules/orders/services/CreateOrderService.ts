import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const getCustomerData = await this.customersRepository.findById(
      customer_id,
    );

    if (!getCustomerData) {
      throw new AppError('Customer does not exists.');
    }

    const recoverProducts = await this.productsRepository.findAllById(products);

    if (recoverProducts.length !== products.length) {
      throw new AppError('Invalid products.');
    }

    recoverProducts.map(product => {
      const key = products.findIndex(
        searchedProduct => searchedProduct.id === product.id,
      );

      if (product.quantity === 0 || products[key].quantity > product.quantity) {
        throw new AppError('Product is unavailable.');
      }

      return product;
    });

    const getProductsData = recoverProducts.map(product => {
      const key = products.findIndex(
        searchedProduct => searchedProduct.id === product.id,
      );

      return {
        product_id: product.id,
        quantity: products[key].quantity,
        price: product.price,
      };
    });

    const order = await this.ordersRepository.create({
      customer: getCustomerData,
      products: getProductsData,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
