import pino from "pino";

const redactions = [
  "req.headers.cookie",
  "req.headers.authorization",
  "req.body.password",
  "req.body.token",
  "req.cookies",
  "response.headers['set-cookie']"
];

const isProd = process.env.NODE_ENV === "production";

// export const logger = pino({
//   redact: {
//     paths: redactions,
//     remove: true
//   },
//   formatters: {
//     level(label) {
//       return { level: label };
//     }
//   },

//   // transport:
//   //   process.env.NODE_ENV !== "production"
//   //     ? {
//   //         target: "pino-pretty",
//   //         options: { colorize: true }
//   //       }
//   //     : {
//   //         target: "pino-roll",
//   //         options: {
//   //           file: "logs/app.log",
//   //           frequency: "daily",
//   //           dateFormat: "yyyy-MM-dd",
//   //           mkdir: true,
//   //           limit: { count: 7 }
//   //         }
//   //       }


//   transport: {
//     targets: [
//       // file logging always on: 
//       {
//         target: "pino-roll",
//         level: "info",
//         options: {
//           file: "logs/app.log",
//           frequency: "daily",
//           dateFormat: "yyyy-MM-dd",
//           mkdir: true,
//           limit: { count: 7 }
//         }
//       },

//       // console logging. (only in dev)
//       ...(!isProd 
//         ? [
//           {
//             target: "pino-pretty",
//             level: "debug",
//             options: { colorize: true }
//           }
//         ]
//         : []
//       )
//     ]
//   }
// });

export const logger = pino({
  redact: {
    paths: redactions,
    remove: true
  },

  // ❌ REMOVE THIS ENTIRE BLOCK
  // formatters: {
  //   level(label) {
  //     return { level: label };
  //   }
  // },

  transport: {
    targets: [
      {
        target: "pino-roll",
        level: "info",
        options: {
          file: "logs/app.log",
          frequency: "daily",
          dateFormat: "yyyy-MM-dd",
          mkdir: true,
          limit: { count: 7 }
        }
      },
      ...(!isProd
        ? [
            {
              target: "pino-pretty",
              level: "debug",
              options: { colorize: true }
            }
          ]
        : [])
    ]
  }
});

export function createChildLogger(module: string) {
  return logger.child({ module });
}
