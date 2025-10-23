-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: host.docker.internal    Database: dermatologico
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table usuarios
--

LOCK TABLES usuarios WRITE;
/*!40000 ALTER TABLE usuarios DISABLE KEYS */;
INSERT INTO usuarios (idUsuarios, correo, contrasenia, Tipo, Estado) VALUES (1,'roberto@ejemplo.com','$2b$10$aEFBTgTbhs9Omq6wXTZ5seYzmMJC4aqMfHUnX6HbEAOjpzKyjBbH2','Paciente','Si'),(2,'roberto@ejemplo.com','$2b$10$noOxr8BjjGYWZKBsEVgEp.17kbfvwJEJ8vfMTBcyssZ3uOnDMdXC6','Paciente','Si'),(3,'roberto@ejemplo.com','$2b$10$QvHtfx0N9R/J8urgCkE/9u4VaYxll3M02bpxpzHiM6paueKPLyyCG','Paciente','No'),(4,'paciente@ejemplo.com','$2b$10$y55ELFFz9XA/8yR4CpQ9MOJXiBhbuadvRpI4t.QdvdwgYT4PJdJJK','Paciente','Si'),(5,'carlos@ejemplo.com','$2b$10$2RWBQARuIlpZmJ1Lw8JhEelLxjVAtz2SecLDIMWriTFiUtQBZA3z.','Administrador','Si'),(6,'carlos@ejemplo.com','$2b$10$NL5ynZu3QyZ39dvw7FcYn.7pco1yoCNyxzUGG5hvyzVFGcLAl1Guu','Administrador','No'),(7,'julio@ejemplo.com','$2b$10$U.oSe4DvAHFb17pxVffnrenwTFphtyXk0Gb/.Z7BAKnIRB8HdntoG','Doctor','No'),(8,'mario@ejemplo.com','$2b$10$bNBU9M2F5P3lryADEbTzHOYpPSAmSPugjBitEG6ENmYh8uhx8ejMy','Doctor','No'),(9,'carloslopez@ejemplo.com','$2b$10$NfoWrPi.MnUWzFz73tlXc.MBcRFSSQd6sU3IIyLkDbLrgdGwOz8/C','Doctor','No'),(10,'julia@ejemplo.com','$2b$10$EjQKkLtWGZumGhLNGYfk8u.5UUJngpJtM5NL/kzFzPspvS/iSqvI6','Doctor','Si'),(11,'carlos@ejemplo.com','$2b$10$Ix9X0BoY9R9U80azMn8/6.7NrU7h.qOPRvAxVgOOQPHmg7A8AjPYS','Doctor','No'),(12,'manolo@ejemplo.com','$2b$10$ID6nQs.rS7.GIzRB6sJFM.AXoXzcn5yUtL4.KXQSpyfVPH.Z7qzYO','Paciente','Si'),(13,'roo@ejemplo.com','$2b$10$CGCQosU1AFMfUdy9HndgWe89dbV5sXw4koZM2gRGqEoibJIy.p9DC','Doctor','Si'),(14,'roo@ejemplo.com','$2b$10$jlwxOa6pi1ztEYL9R.E2..HG.0Pl9cuX97BM3OFL7mMYhzMtNGaA.','Doctor','Si'),(15,'roo@ejemplo.com','$2b$10$CuYc.U6PAF0sBxlKu6/BcePZg7aVUnGGvl8aDAvW/LEZfjjAgc1QC','Doctor','Si'),(16,'juana@ejemplo.com','$2b$10$puUwrejZQPqgoGE83OZ0v..RdQ6dXsMITPOZ9gPl89mbayE6ZCMlS','Secretaria','Si') ON CONFLICT DO NOTHING;
/*!40000 ALTER TABLE usuarios ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-21  2:56:11
