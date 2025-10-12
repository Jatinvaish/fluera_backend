
// // ============================================
// // config/database.config.ts
// // ============================================
// import { registerAs } from '@nestjs/config';

// export default registerAs('database', () => ({
//   sqlServer: {
//     type: 'mssql',
//     host: process.env.DB_HOST || 'localhost',
//     port:  process.env.DB_PORT  || 1433,
//     username: process.env.DB_USERNAME || 'sa',
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_DATABASE || 'fluera_db',
//     options: {
//       encrypt: process.env.DB_ENCRYPT === 'true',
//       trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
//       enableArithAbort: true,
//     },
//     pool: {
//       max:  process.env.DB_POOL_MAX  || 10,
//       min:  process.env.DB_POOL_MIN  || 0,
//       idleTimeoutMillis: 30000,
//     },
//     requestTimeout: 30000,
//     logging: process.env.DB_LOGGING === 'true',
//     synchronize: false, // Never true in production
//   },
//   mongodb: {
//     uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/fluera',
//     options: {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//       maxPoolSize: 10,
//       minPoolSize: 2,
//     },
//   },
// }));


// ============================================
// config/database.config.ts
// ============================================
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  sqlServer: {
    server: process.env.DB_HOST || 'localhost',
    port:  1433,
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'fluera_db',
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
      enableArithAbort: true,
    },
    pool: {
      max:  10,
      min:  0,
      idleTimeoutMillis: 30000,
    },
    requestTimeout: 30000,
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/fluera',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      minPoolSize: 2,
    },
  },
}));