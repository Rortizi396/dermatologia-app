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
-- Current Database: `dermatologico`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `dermatologico` /*!40100 DEFAULT CHARACTER SET utf8mb3 */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `dermatologico`;

--
-- Table structure for table `administradores`
--

DROP TABLE IF EXISTS `administradores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `administradores` (
  `idAdministradores` int NOT NULL AUTO_INCREMENT,
  `Nombres` varchar(45) NOT NULL,
  `Apellidos` varchar(45) NOT NULL,
  `Correo` varchar(45) NOT NULL,
  `Activo` varchar(5) DEFAULT NULL,
  PRIMARY KEY (`idAdministradores`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `administradores`
--

LOCK TABLES `administradores` WRITE;
/*!40000 ALTER TABLE `administradores` DISABLE KEYS */;
INSERT INTO `administradores` VALUES (1,'Carlos Roberto','Itzep','carlos@ejemplo.com','Si');
/*!40000 ALTER TABLE `administradores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_type` varchar(100) DEFAULT NULL,
  `resource_type` varchar(100) DEFAULT NULL,
  `resource_id` varchar(255) DEFAULT NULL,
  `old_value` text,
  `new_value` text,
  `changed_by` varchar(255) DEFAULT NULL,
  `ip` varchar(100) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
INSERT INTO `audit_log` VALUES (1,'appointment_create','appointment','12',NULL,'{\"idCitas\":12,\"Fecha\":\"2025-10-18T06:00:00.000Z\",\"Hora\":\"09:30:00\",\"Observaciones\":\"├▒\",\"Confirmado\":\"Pendiente\",\"patientNames\":\"Roberto\",\"patientLastNames\":\"Ortiz\",\"patientDpi\":1234567891234,\"patientPhone\":\"48863190\",\"patientEmail\":\"roberto@ejemplo.com\",\"specialtyName\":\"Dermatologia general\",\"doctorName\":\"julia\",\"doctorLastNames\":\"manrique\"}','paciente@ejemplo.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 08:54:27'),(2,'appointment_confirm','appointment','12',NULL,'Confirmada','paciente@ejemplo.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 08:54:40'),(3,'appointment_cancel','appointment','12',NULL,'Cancelada','paciente@ejemplo.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 08:54:43'),(4,'appointment_undo','appointment','12','{\"idCitas\":12,\"Paciente\":1234567891234,\"Consulta_Especialidad\":1,\"Profesional_Responsable\":99935,\"Observaciones\":\"├▒\",\"Fecha\":\"2025-10-18T06:00:00.000Z\",\"Hora\":\"09:30:00\",\"Confirmado\":\"Cancelada\",\"Id_Creador\":4,\"Tipo_Creador\":\"Paciente\"}','Pendiente','carlos@ejemplo.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 09:03:42'),(5,'appointment_confirm','appointment','12','Pendiente','Confirmada','carlos@ejemplo.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 16:33:15'),(6,'appointment_cancel','appointment','12','Confirmada','Cancelada','carlos@ejemplo.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 16:33:27'),(7,'appointment_undo','appointment','12','{\"idCitas\":12,\"Paciente\":1234567891234,\"Consulta_Especialidad\":1,\"Profesional_Responsable\":99935,\"Observaciones\":\"├▒\",\"Fecha\":\"2025-10-18T06:00:00.000Z\",\"Hora\":\"09:30:00\",\"Confirmado\":\"Cancelada\",\"Id_Creador\":4,\"Tipo_Creador\":\"Paciente\"}','Confirmada','carlos@ejemplo.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 16:34:34'),(8,'user_activate','user','9','{\"idUsuarios\":9,\"correo\":\"carloslopez@ejemplo.com\",\"contrasenia\":\"$2b$10$NfoWrPi.MnUWzFz73tlXc.MBcRFSSQd6sU3IIyLkDbLrgdGwOz8/C\",\"Tipo\":\"Doctor\",\"Estado\":\"No\"}','{\"idUsuarios\":9,\"correo\":\"carloslopez@ejemplo.com\",\"contrasenia\":\"$2b$10$NfoWrPi.MnUWzFz73tlXc.MBcRFSSQd6sU3IIyLkDbLrgdGwOz8/C\",\"Tipo\":\"Doctor\",\"Estado\":\"Si\"}','carlos@ejemplo.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 16:35:35'),(9,'user_inactivate','user','9','{\"idUsuarios\":9,\"correo\":\"carloslopez@ejemplo.com\",\"contrasenia\":\"$2b$10$NfoWrPi.MnUWzFz73tlXc.MBcRFSSQd6sU3IIyLkDbLrgdGwOz8/C\",\"Tipo\":\"Doctor\",\"Estado\":\"Si\"}','{\"idUsuarios\":9,\"correo\":\"carloslopez@ejemplo.com\",\"contrasenia\":\"$2b$10$NfoWrPi.MnUWzFz73tlXc.MBcRFSSQd6sU3IIyLkDbLrgdGwOz8/C\",\"Tipo\":\"Doctor\",\"Estado\":\"No\"}','carlos@ejemplo.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 16:35:42'),(10,'appointment_create','appointment','13',NULL,'{\"idCitas\":13,\"Fecha\":\"2025-10-18T06:00:00.000Z\",\"Hora\":\"09:00:00\",\"Observaciones\":\"iharsfaosfoahfd\",\"Confirmado\":\"Pendiente\",\"patientNames\":\"Roberto\",\"patientLastNames\":\"Ortiz\",\"patientDpi\":1234567891234,\"patientPhone\":\"48863190\",\"patientEmail\":\"roberto@ejemplo.com\",\"specialtyName\":\"Dermatologia general\",\"doctorName\":\"julia\",\"doctorLastNames\":\"manrique\"}','juana@ejemplo.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 17:01:22'),(11,'appointment_confirm','appointment','13','Pendiente','Confirmada','juana@ejemplo.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 17:01:47'),(12,'appointment_cancel','appointment','13','Confirmada','Cancelada','juana@ejemplo.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 17:01:52'),(13,'appointment_undo','appointment','13','{\"idCitas\":13,\"Paciente\":1234567891234,\"Consulta_Especialidad\":1,\"Profesional_Responsable\":99935,\"Observaciones\":\"iharsfaosfoahfd\",\"Fecha\":\"2025-10-18T06:00:00.000Z\",\"Hora\":\"09:00:00\",\"Confirmado\":\"Cancelada\",\"Id_Creador\":16,\"Tipo_Creador\":\"Secretaria\"}','Confirmada','carlos@ejemplo.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 17:02:11'),(14,'appointment_cancel','appointment','13','Confirmada','Cancelada','carlos@ejemplo.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 17:14:30'),(15,'appointment_undo','appointment','13','{\"idCitas\":13,\"Paciente\":1234567891234,\"Consulta_Especialidad\":1,\"Profesional_Responsable\":99935,\"Observaciones\":\"iharsfaosfoahfd\",\"Fecha\":\"2025-10-18T06:00:00.000Z\",\"Hora\":\"09:00:00\",\"Confirmado\":\"Cancelada\",\"Id_Creador\":16,\"Tipo_Creador\":\"Secretaria\"}','Confirmada','carlos@ejemplo.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 17:14:44'),(16,'appointment_create','appointment','14',NULL,'{\"idCitas\":14,\"Fecha\":\"2025-10-21T06:00:00.000Z\",\"Hora\":\"10:00:00\",\"Observaciones\":\"Hola\",\"Confirmado\":\"Pendiente\",\"patientNames\":\"Roberto\",\"patientLastNames\":\"Ortiz\",\"patientDpi\":1234567891234,\"patientPhone\":\"48863190\",\"patientEmail\":\"roberto@ejemplo.com\",\"specialtyName\":\"Dermatologia general\",\"doctorName\":\"julia\",\"doctorLastNames\":\"manrique\"}','paciente@ejemplo.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 18:35:53'),(17,'appointment_cancel','appointment','13','Confirmada','Cancelada','carlos@ejemplo.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 23:38:00'),(18,'user_activate','user','2','{\"idUsuarios\":2,\"correo\":\"roberto@ejemplo.com\",\"contrasenia\":\"$2b$10$noOxr8BjjGYWZKBsEVgEp.17kbfvwJEJ8vfMTBcyssZ3uOnDMdXC6\",\"Tipo\":\"Paciente\",\"Estado\":\"No\"}','{\"idUsuarios\":2,\"correo\":\"roberto@ejemplo.com\",\"contrasenia\":\"$2b$10$noOxr8BjjGYWZKBsEVgEp.17kbfvwJEJ8vfMTBcyssZ3uOnDMdXC6\",\"Tipo\":\"Paciente\",\"Estado\":\"Si\"}','carlos@ejemplo.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 23:38:28'),(19,'user_inactivate','user','1','{\"idUsuarios\":1,\"correo\":\"roberto@ejemplo.com\",\"contrasenia\":\"$2b$10$aEFBTgTbhs9Omq6wXTZ5seYzmMJC4aqMfHUnX6HbEAOjpzKyjBbH2\",\"Tipo\":\"Paciente\",\"Estado\":\"Si\"}','{\"idUsuarios\":1,\"correo\":\"roberto@ejemplo.com\",\"contrasenia\":\"$2b$10$aEFBTgTbhs9Omq6wXTZ5seYzmMJC4aqMfHUnX6HbEAOjpzKyjBbH2\",\"Tipo\":\"Paciente\",\"Estado\":\"No\"}','carlos@ejemplo.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 23:38:38'),(20,'appointment_undo','appointment','13','{\"idCitas\":13,\"Paciente\":1234567891234,\"Consulta_Especialidad\":1,\"Profesional_Responsable\":99935,\"Observaciones\":\"iharsfaosfoahfd\",\"Fecha\":\"2025-10-18T06:00:00.000Z\",\"Hora\":\"09:00:00\",\"Confirmado\":\"Cancelada\",\"Id_Creador\":16,\"Tipo_Creador\":\"Secretaria\"}','Confirmada','carlos@ejemplo.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 23:40:57'),(21,'appointment_create','appointment','15',NULL,'{\"idCitas\":15,\"Fecha\":\"2025-10-19T06:00:00.000Z\",\"Hora\":\"09:00:00\",\"Observaciones\":\"\",\"Confirmado\":\"Pendiente\",\"patientNames\":\"Roberto\",\"patientLastNames\":\"Ortiz\",\"patientDpi\":1234567891234,\"patientPhone\":\"48863190\",\"patientEmail\":\"roberto@ejemplo.com\",\"specialtyName\":\"Dermatologia general\",\"doctorName\":\"julia\",\"doctorLastNames\":\"manrique\"}','juana@ejemplo.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-18 23:42:51'),(22,'appointment_confirm','appointment','15','Pendiente','Confirmada','julia@ejemplo.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-19 07:54:25'),(23,'appointment_confirm','appointment','15','Confirmada','Confirmada','julia@ejemplo.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-19 07:54:27'),(24,'user_update','user','1234567891234','{\"DPI\":1234567891234,\"Nombres\":\"Roberto\",\"Apellidos\":\"Ortiz\",\"Telefono\":\"48863190\",\"Correo\":\"roberto@ejemplo.com\",\"Activo\":\"SI\"}','{\"DPI\":1234567891234,\"Nombres\":\"Roberto Carlos\",\"Apellidos\":\"Ortiz\",\"Telefono\":\"48863190\",\"Correo\":\"roberto@ejemplo.com\",\"Activo\":\"Si\"}','carlos@ejemplo.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-19 09:12:19'),(25,'usuario_sync','user','1','{\"idUsuarios\":1,\"correo\":\"roberto@ejemplo.com\",\"contrasenia\":\"$2b$10$aEFBTgTbhs9Omq6wXTZ5seYzmMJC4aqMfHUnX6HbEAOjpzKyjBbH2\",\"Tipo\":\"Paciente\",\"Estado\":\"No\"}','{\"idUsuarios\":1,\"correo\":\"roberto@ejemplo.com\",\"contrasenia\":\"$2b$10$aEFBTgTbhs9Omq6wXTZ5seYzmMJC4aqMfHUnX6HbEAOjpzKyjBbH2\",\"Tipo\":\"Paciente\",\"Estado\":\"Si\"}','carlos@ejemplo.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-19 09:12:19'),(26,'user_update','user','1','{\"idAdministradores\":1,\"Nombres\":\"Carlos\",\"Apellidos\":\"Itzep\",\"Correo\":\"carlos@ejemplo.com\",\"Activo\":\"SI\"}','{\"idAdministradores\":1,\"Nombres\":\"Carlos Roberto\",\"Apellidos\":\"Itzep\",\"Correo\":\"carlos@ejemplo.com\",\"Activo\":\"Si\"}','carlos@ejemplo.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-19 09:12:45'),(27,'usuario_sync','user','5','{\"idUsuarios\":5,\"correo\":\"carlos@ejemplo.com\",\"contrasenia\":\"$2b$10$2RWBQARuIlpZmJ1Lw8JhEelLxjVAtz2SecLDIMWriTFiUtQBZA3z.\",\"Tipo\":\"Administrador\",\"Estado\":\"Si\"}','{\"idUsuarios\":5,\"correo\":\"carlos@ejemplo.com\",\"contrasenia\":\"$2b$10$2RWBQARuIlpZmJ1Lw8JhEelLxjVAtz2SecLDIMWriTFiUtQBZA3z.\",\"Tipo\":\"Administrador\",\"Estado\":\"Si\"}','carlos@ejemplo.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-19 09:12:45'),(28,'user_update','user','99935','{\"Colegiado\":99935,\"Nombres\":\"julia\",\"Apellidos\":\"manrique\",\"Especialidad\":\"Dermatologia general,Psicologia\",\"Telefono\":\"64654634\",\"Correo\":\"julia@ejemplo.com\",\"Activo\":\"SI\"}','{\"Colegiado\":99935,\"Nombres\":\"Marta julia\",\"Apellidos\":\"manrique\",\"Especialidad\":\"Dermatologia general,Psicologia\",\"Telefono\":\"64654634\",\"Correo\":\"julia@ejemplo.com\",\"Activo\":\"Si\"}','carlos@ejemplo.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-19 09:13:04'),(29,'usuario_sync','user','10','{\"idUsuarios\":10,\"correo\":\"julia@ejemplo.com\",\"contrasenia\":\"$2b$10$EjQKkLtWGZumGhLNGYfk8u.5UUJngpJtM5NL/kzFzPspvS/iSqvI6\",\"Tipo\":\"Doctor\",\"Estado\":\"Si\"}','{\"idUsuarios\":10,\"correo\":\"julia@ejemplo.com\",\"contrasenia\":\"$2b$10$EjQKkLtWGZumGhLNGYfk8u.5UUJngpJtM5NL/kzFzPspvS/iSqvI6\",\"Tipo\":\"Doctor\",\"Estado\":\"Si\"}','carlos@ejemplo.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-19 09:13:04'),(30,'user_update','user','1','{\"idSecretarias\":1,\"Nombres\":\"Juana\",\"Apellidos\":\"Perez\",\"Telefono\":\"12354687\",\"Correo\":\"juana@ejemplo.com\",\"Activo\":\"SI\"}','{\"idSecretarias\":1,\"Nombres\":\"Juana Cecilia\",\"Apellidos\":\"Perez\",\"Telefono\":\"12354687\",\"Correo\":\"juana@ejemplo.com\",\"Activo\":\"Si\"}','carlos@ejemplo.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-19 09:13:25'),(31,'usuario_sync','user','16','{\"idUsuarios\":16,\"correo\":\"juana@ejemplo.com\",\"contrasenia\":\"$2b$10$puUwrejZQPqgoGE83OZ0v..RdQ6dXsMITPOZ9gPl89mbayE6ZCMlS\",\"Tipo\":\"Secretaria\",\"Estado\":\"Si\"}','{\"idUsuarios\":16,\"correo\":\"juana@ejemplo.com\",\"contrasenia\":\"$2b$10$puUwrejZQPqgoGE83OZ0v..RdQ6dXsMITPOZ9gPl89mbayE6ZCMlS\",\"Tipo\":\"Secretaria\",\"Estado\":\"Si\"}','carlos@ejemplo.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2025-10-19 09:13:25');
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `citas`
--

DROP TABLE IF EXISTS `citas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `citas` (
  `idCitas` int NOT NULL AUTO_INCREMENT,
  `Paciente` bigint DEFAULT NULL,
  `Consulta_Especialidad` int NOT NULL,
  `Profesional_Responsable` int NOT NULL,
  `Observaciones` varchar(255) NOT NULL,
  `Fecha` date NOT NULL,
  `Hora` time NOT NULL,
  `Confirmado` enum('Pendiente','Confirmada','Cancelada') NOT NULL,
  `Id_Creador` int NOT NULL,
  `Tipo_Creador` enum('Paciente','Secretaria') NOT NULL,
  PRIMARY KEY (`idCitas`),
  KEY `FK_Esp_Cita_idx` (`Consulta_Especialidad`),
  KEY `FK_Doc_Cita_idx` (`Profesional_Responsable`),
  KEY `FK_Pac_Cita_idx` (`Paciente`),
  CONSTRAINT `FK_Doc_Cita` FOREIGN KEY (`Profesional_Responsable`) REFERENCES `doctores` (`Colegiado`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_Esp_Cita` FOREIGN KEY (`Consulta_Especialidad`) REFERENCES `especialidades` (`idEspecialidades`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `citas`
--

LOCK TABLES `citas` WRITE;
/*!40000 ALTER TABLE `citas` DISABLE KEYS */;
INSERT INTO `citas` VALUES (10,1234567891234,1,99935,'Puntos negros','2025-10-18','09:00:00','Cancelada',1,'Paciente'),(11,1234567891234,1,99935,'Prueba','2025-10-18','09:30:00','Cancelada',1,'Paciente'),(12,1234567891234,1,99935,'├▒','2025-10-18','09:30:00','Confirmada',4,'Paciente'),(13,1234567891234,1,99935,'iharsfaosfoahfd','2025-10-18','09:00:00','Confirmada',16,'Secretaria'),(14,1234567891234,1,99935,'Hola','2025-10-21','10:00:00','Pendiente',4,'Paciente'),(15,1234567891234,1,99935,'','2025-10-19','09:00:00','Confirmada',16,'Secretaria');
/*!40000 ALTER TABLE `citas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doctores`
--

DROP TABLE IF EXISTS `doctores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctores` (
  `Colegiado` int NOT NULL,
  `Nombres` varchar(45) NOT NULL,
  `Apellidos` varchar(45) NOT NULL,
  `Especialidad` varchar(45) NOT NULL,
  `Telefono` varchar(45) NOT NULL,
  `Correo` varchar(45) NOT NULL,
  `Activo` varchar(5) DEFAULT NULL,
  PRIMARY KEY (`Colegiado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doctores`
--

LOCK TABLES `doctores` WRITE;
/*!40000 ALTER TABLE `doctores` DISABLE KEYS */;
INSERT INTO `doctores` VALUES (54,'','','','','carlos@ejemplo.com','SI'),(12345,'julio','lopez','','45648996','julio@ejemplo.com','SI'),(85549,'Mario','Perez','Dermatologia general,Psicologia','88663147','mario@ejemplo.com','SI'),(88885,'carlos','lopez','Dermatologia general,Psicologia','84986456','carloslopez@ejemplo.com','SI'),(99935,'Marta julia','manrique','Dermatologia general,Psicologia','64654634','julia@ejemplo.com','Si');
/*!40000 ALTER TABLE `doctores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `especialidades`
--

DROP TABLE IF EXISTS `especialidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `especialidades` (
  `idEspecialidades` int NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(45) NOT NULL,
  `Descripcion` varchar(255) NOT NULL,
  PRIMARY KEY (`idEspecialidades`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `especialidades`
--

LOCK TABLES `especialidades` WRITE;
/*!40000 ALTER TABLE `especialidades` DISABLE KEYS */;
INSERT INTO `especialidades` VALUES (1,'Dermatologia general','Dermatologia a nivel general'),(2,'Psicologia','Apoya a pacientes con afecciones dermatologicas'),(3,'Dermatologia intensiva','Para casos generales graves'),(4,'Pediatria','');
/*!40000 ALTER TABLE `especialidades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `especialidades_has_doctores`
--

DROP TABLE IF EXISTS `especialidades_has_doctores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `especialidades_has_doctores` (
  `Especialidades_idEspecialidades` int NOT NULL,
  `Doctores_Colegiado` int NOT NULL,
  `Ref` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`Ref`),
  KEY `fk_Especialidades_has_Doctores_Doctores1_idx` (`Doctores_Colegiado`),
  KEY `fk_Especialidades_has_Doctores_Especialidades1_idx` (`Especialidades_idEspecialidades`),
  CONSTRAINT `fk_Especialidades_has_Doctores_Doctores1` FOREIGN KEY (`Doctores_Colegiado`) REFERENCES `doctores` (`Colegiado`),
  CONSTRAINT `fk_Especialidades_has_Doctores_Especialidades1` FOREIGN KEY (`Especialidades_idEspecialidades`) REFERENCES `especialidades` (`idEspecialidades`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `especialidades_has_doctores`
--

LOCK TABLES `especialidades_has_doctores` WRITE;
/*!40000 ALTER TABLE `especialidades_has_doctores` DISABLE KEYS */;
INSERT INTO `especialidades_has_doctores` VALUES (1,99935,1),(2,99935,2);
/*!40000 ALTER TABLE `especialidades_has_doctores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pacientes`
--

DROP TABLE IF EXISTS `pacientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pacientes` (
  `DPI` bigint NOT NULL,
  `Nombres` varchar(45) NOT NULL,
  `Apellidos` varchar(45) NOT NULL,
  `Telefono` varchar(45) NOT NULL,
  `Correo` varchar(45) NOT NULL,
  `Activo` varchar(5) DEFAULT NULL,
  PRIMARY KEY (`DPI`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pacientes`
--

LOCK TABLES `pacientes` WRITE;
/*!40000 ALTER TABLE `pacientes` DISABLE KEYS */;
INSERT INTO `pacientes` VALUES (466546564687,'pepe','dominguez','12345678','paciente@ejemplo.com','SI'),(1234567891234,'Roberto Carlos','Ortiz','48863190','roberto@ejemplo.com','Si'),(7894561237894,'manolo','perez','48567832','manolo@ejemplo.com','SI');
/*!40000 ALTER TABLE `pacientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `secretarias`
--

DROP TABLE IF EXISTS `secretarias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `secretarias` (
  `idSecretarias` int NOT NULL AUTO_INCREMENT,
  `Nombres` varchar(45) NOT NULL,
  `Apellidos` varchar(45) NOT NULL,
  `Telefono` varchar(45) NOT NULL,
  `Correo` varchar(45) NOT NULL,
  `Activo` varchar(5) DEFAULT NULL,
  PRIMARY KEY (`idSecretarias`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `secretarias`
--

LOCK TABLES `secretarias` WRITE;
/*!40000 ALTER TABLE `secretarias` DISABLE KEYS */;
INSERT INTO `secretarias` VALUES (1,'Juana Cecilia','Perez','12354687','juana@ejemplo.com','Si');
/*!40000 ALTER TABLE `secretarias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `site_settings`
--

DROP TABLE IF EXISTS `site_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_settings` (
  `key` varchar(100) NOT NULL,
  `value` text,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `site_settings`
--

LOCK TABLES `site_settings` WRITE;
/*!40000 ALTER TABLE `site_settings` DISABLE KEYS */;
INSERT INTO `site_settings` VALUES ('mission','Brindar salud y bienestar a nuestros pacientes gui├índolos en el proceso de cuidar y amar su piel ofreciendo los mejores tratamientos que permitan potenciar el poder del amor propio'),('vision','Ser reconocido por nuestros pacientes como la opci├│n m├ís confiable y profesional respecto al cuidado de la piel. Posicionarnos como referente nacional e internacional de la salud y belleza de la piel.');
/*!40000 ALTER TABLE `site_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `site_settings_audit`
--

DROP TABLE IF EXISTS `site_settings_audit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_settings_audit` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `key` varchar(100) DEFAULT NULL,
  `old_value` text,
  `new_value` text,
  `changed_by` varchar(255) DEFAULT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `site_settings_audit`
--

LOCK TABLES `site_settings_audit` WRITE;
/*!40000 ALTER TABLE `site_settings_audit` DISABLE KEYS */;
INSERT INTO `site_settings_audit` VALUES (1,'mission','Misi´┐¢n actualizada - prueba ruta espec´┐¢fica','Misi´┐¢nregistro auditor´┐¢a prueba',NULL,'2025-10-18 05:50:12'),(2,'vision',NULL,'Hola','carlos@ejemplo.com','2025-10-18 08:13:28'),(3,'vision','Hola','Hola','carlos@ejemplo.com','2025-10-18 08:13:33'),(4,'mission','Misi´┐¢nregistro auditor´┐¢a prueba','Prueba','carlos@ejemplo.com','2025-10-18 17:15:43'),(5,'mission','Prueba','Prueba','carlos@ejemplo.com','2025-10-18 17:15:44'),(6,'mission','Prueba','Brindar salud y bienestar a nuestros pacientes gui├índolos en el proceso de cuidar y amar su piel ofreciendo los mejores tratamientos que permitan potenciar el poder del amor propio','carlos@ejemplo.com','2025-10-19 09:15:36'),(7,'vision','Hola','Ser reconocido por nuestros pacientes como la opci├│n m├ís confiable y profesional respecto al cuidado de la piel. Posicionarnos como referente nacional e internacional de la salud y belleza de la piel.','carlos@ejemplo.com','2025-10-19 09:15:37'),(8,'vision','Ser reconocido por nuestros pacientes como la opci├│n m├ís confiable y profesional respecto al cuidado de la piel. Posicionarnos como referente nacional e internacional de la salud y belleza de la piel.','Ser reconocido por nuestros pacientes como la opci├│n m├ís confiable y profesional respecto al cuidado de la piel. Posicionarnos como referente nacional e internacional de la salud y belleza de la piel.','carlos@ejemplo.com','2025-10-19 09:15:39'),(9,'vision','Ser reconocido por nuestros pacientes como la opci├│n m├ís confiable y profesional respecto al cuidado de la piel. Posicionarnos como referente nacional e internacional de la salud y belleza de la piel.','Ser reconocido por nuestros pacientes como la opci├│n m├ís confiable y profesional respecto al cuidado de la piel. Posicionarnos como referente nacional e internacional de la salud y belleza de la piel.','carlos@ejemplo.com','2025-10-19 09:15:40');
/*!40000 ALTER TABLE `site_settings_audit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_preferences`
--

DROP TABLE IF EXISTS `user_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_preferences` (
  `userId` varchar(100) NOT NULL,
  `key` varchar(100) NOT NULL,
  `value` text,
  PRIMARY KEY (`userId`,`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_preferences`
--

LOCK TABLES `user_preferences` WRITE;
/*!40000 ALTER TABLE `user_preferences` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_preferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `idUsuarios` int NOT NULL AUTO_INCREMENT,
  `correo` varchar(45) NOT NULL,
  `contrasenia` varchar(255) DEFAULT NULL,
  `Tipo` enum('Administrador','Paciente','Secretaria','Doctor') NOT NULL,
  `Estado` enum('Si','No') NOT NULL,
  PRIMARY KEY (`idUsuarios`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'roberto@ejemplo.com','$2b$10$aEFBTgTbhs9Omq6wXTZ5seYzmMJC4aqMfHUnX6HbEAOjpzKyjBbH2','Paciente','Si'),(2,'roberto@ejemplo.com','$2b$10$noOxr8BjjGYWZKBsEVgEp.17kbfvwJEJ8vfMTBcyssZ3uOnDMdXC6','Paciente','Si'),(3,'roberto@ejemplo.com','$2b$10$QvHtfx0N9R/J8urgCkE/9u4VaYxll3M02bpxpzHiM6paueKPLyyCG','Paciente','No'),(4,'paciente@ejemplo.com','$2b$10$y55ELFFz9XA/8yR4CpQ9MOJXiBhbuadvRpI4t.QdvdwgYT4PJdJJK','Paciente','Si'),(5,'carlos@ejemplo.com','$2b$10$2RWBQARuIlpZmJ1Lw8JhEelLxjVAtz2SecLDIMWriTFiUtQBZA3z.','Administrador','Si'),(6,'carlos@ejemplo.com','$2b$10$NL5ynZu3QyZ39dvw7FcYn.7pco1yoCNyxzUGG5hvyzVFGcLAl1Guu','Administrador','No'),(7,'julio@ejemplo.com','$2b$10$U.oSe4DvAHFb17pxVffnrenwTFphtyXk0Gb/.Z7BAKnIRB8HdntoG','Doctor','No'),(8,'mario@ejemplo.com','$2b$10$bNBU9M2F5P3lryADEbTzHOYpPSAmSPugjBitEG6ENmYh8uhx8ejMy','Doctor','No'),(9,'carloslopez@ejemplo.com','$2b$10$NfoWrPi.MnUWzFz73tlXc.MBcRFSSQd6sU3IIyLkDbLrgdGwOz8/C','Doctor','No'),(10,'julia@ejemplo.com','$2b$10$EjQKkLtWGZumGhLNGYfk8u.5UUJngpJtM5NL/kzFzPspvS/iSqvI6','Doctor','Si'),(11,'carlos@ejemplo.com','$2b$10$Ix9X0BoY9R9U80azMn8/6.7NrU7h.qOPRvAxVgOOQPHmg7A8AjPYS','Doctor','No'),(12,'manolo@ejemplo.com','$2b$10$ID6nQs.rS7.GIzRB6sJFM.AXoXzcn5yUtL4.KXQSpyfVPH.Z7qzYO','Paciente','Si'),(13,'roo@ejemplo.com','$2b$10$CGCQosU1AFMfUdy9HndgWe89dbV5sXw4koZM2gRGqEoibJIy.p9DC','Doctor','Si'),(14,'roo@ejemplo.com','$2b$10$jlwxOa6pi1ztEYL9R.E2..HG.0Pl9cuX97BM3OFL7mMYhzMtNGaA.','Doctor','Si'),(15,'roo@ejemplo.com','$2b$10$CuYc.U6PAF0sBxlKu6/BcePZg7aVUnGGvl8aDAvW/LEZfjjAgc1QC','Doctor','Si'),(16,'juana@ejemplo.com','$2b$10$puUwrejZQPqgoGE83OZ0v..RdQ6dXsMITPOZ9gPl89mbayE6ZCMlS','Secretaria','Si');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'dermatologico'
--

--
-- Dumping routines for database 'dermatologico'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-21  2:15:28
