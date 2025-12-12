const { ApolloServer, gql } = require("apollo-server-express");
const jwt = require("jsonwebtoken");
const prisma = require("./prisma");
const { validateId, requireNumber } = require("./utils/validation");

const typeDefs = gql`
  type User {
    id: Int!
    email: String!
    name: String!
    role: String!
    createdAt: String!
  }

  type Product {
    id: Int!
    name: String!
    description: String!
    price: Float!
    stock: Int!
    category: String!
    createdAt: String!
  }

  type OrderItem {
    id: Int!
    product: Product!
    productId: Int!
    quantity: Int!
    price: Float!
  }

  type Payment {
    id: Int!
    amount: Float!
    status: String!
    createdAt: String!
  }

  type Delivery {
    id: Int!
    status: String!
    method: String
    address: String
    estimatedAt: String
    updatedAt: String!
  }

  type Order {
    id: Int!
    status: String!
    total: Float!
    createdAt: String!
    items: [OrderItem!]!
    payment: Payment
    delivery: Delivery
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input OrderItemInput {
    productId: Int!
    quantity: Int!
  }

  input DeliveryInput {
    method: String
    address: String
    pickupPoint: String
  }

  type Query {
    products: [Product!]!
    product(id: Int!): Product
    me: User
    myOrders: [Order!]!
  }

  type Mutation {
    createOrder(items: [OrderItemInput!]!, delivery: DeliveryInput): Order!
  }
`;

const resolvers = {
  Query: {
    products: () => prisma.product.findMany(),
    product: async (_, { id }) => {
      const productId = validateId(id);
      return prisma.product.findUnique({ where: { id: productId } });
    },
    me: async (_, __, { user }) => user || null,
    myOrders: async (_, __, { user }) => {
      if (!user) throw new Error("Non authentifié");
      return prisma.order.findMany({
        where: { userId: user.id },
        include: { items: { include: { product: true } }, payment: true, delivery: true },
        orderBy: { createdAt: "desc" },
      });
    },
  },
  Mutation: {
    createOrder: async (_, { items, delivery }, { user }) => {
      if (!user) throw new Error("Non authentifié");

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error("La commande doit contenir au moins un produit.");
      }
      if (items.length > 100) {
        throw new Error("Trop d'articles (max 100).");
      }

      const deliveryMethod = delivery?.method || "delivery";
      if (!["delivery", "pickup"].includes(deliveryMethod)) {
        throw new Error("delivery.method doit être 'delivery' ou 'pickup'.");
      }
      if (deliveryMethod === "delivery" && !delivery?.address) {
        throw new Error("delivery.address requis pour une livraison.");
      }
      if (deliveryMethod === "pickup" && !delivery?.pickupPoint) {
        throw new Error("delivery.pickupPoint requis pour un retrait.");
      }

      for (const item of items) {
        item.productId = validateId(item.productId);
        item.quantity = requireNumber(item.quantity, { min: 1, max: 100, field: "quantity" });
      }

      const productIds = items.map((i) => i.productId);
      const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
      if (products.length !== productIds.length) {
        throw new Error("Certains produits n'existent pas.");
      }

      let total = 0;
      const validatedItems = [];
      for (const item of items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) throw new Error(`Produit ${item.productId} introuvable.`);
        if (product.stock < item.quantity) {
          throw new Error(`Stock insuffisant pour "${product.name}".`);
        }
        const itemTotal = product.price * item.quantity;
        total += itemTotal;
        validatedItems.push({
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
        });
      }

      const order = await prisma.$transaction(async (tx) => {
        const createdOrder = await tx.order.create({
          data: {
            userId: user.id,
            status: "pending",
            total,
            items: { create: validatedItems },
          },
        });

        for (const item of validatedItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        await tx.payment.create({
          data: { orderId: createdOrder.id, amount: total, status: "processing" },
        });

        await tx.delivery.create({
          data: {
            orderId: createdOrder.id,
            status: "preparing",
            address: delivery?.address || delivery?.pickupPoint || null,
            method: deliveryMethod,
          },
        });

        return tx.order.findUnique({
          where: { id: createdOrder.id },
          include: { items: { include: { product: true } }, payment: true, delivery: true },
        });
      });

      return order;
    },
  },
};

async function applyGraphQL(app) {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      let user = null;
      const auth = req.headers.authorization;
      if (auth && auth.startsWith("Bearer ")) {
        const token = auth.split(" ")[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, name: true, role: true, createdAt: true },
          });
        } catch (_err) {
          user = null;
        }
      }
      return { user };
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: "/graphql" });
}

module.exports = applyGraphQL;
