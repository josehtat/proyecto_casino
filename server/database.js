import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: "mysql",
    logging: false,
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log("Conexión a MySQL establecida.");
    } catch (error) {
        console.error("Error conectando a MySQL:", error);
        process.exit(1);
    }
};

export default connectDB; // Ahora exporta como default
export { sequelize };