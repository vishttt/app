-- MySQL dump 10.13  Distrib 5.5.58, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: gamedb
-- ------------------------------------------------------
-- Server version	5.5.58-0ubuntu0.14.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Answer`
--

DROP TABLE IF EXISTS `Answer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Answer` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `QuestionId` int(11) NOT NULL,
  `Content` text COLLATE utf8_unicode_ci NOT NULL,
  `IsCorrect` tinyint(1) NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Answer`
--

LOCK TABLES `Answer` WRITE;
/*!40000 ALTER TABLE `Answer` DISABLE KEYS */;
/*!40000 ALTER TABLE `Answer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `AnswerInstance`
--

DROP TABLE IF EXISTS `AnswerInstance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `AnswerInstance` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `QuestionInstanceId` int(11) NOT NULL,
  `TimeStamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `AnswerId` int(11) NOT NULL,
  `UserInstanceId` int(11) NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AnswerInstance`
--

LOCK TABLES `AnswerInstance` WRITE;
/*!40000 ALTER TABLE `AnswerInstance` DISABLE KEYS */;
/*!40000 ALTER TABLE `AnswerInstance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Question`
--

DROP TABLE IF EXISTS `Question`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Question` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `Title` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `Content` text COLLATE utf8_unicode_ci NOT NULL,
  `Time` int(11) DEFAULT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Question`
--

LOCK TABLES `Question` WRITE;
/*!40000 ALTER TABLE `Question` DISABLE KEYS */;
/*!40000 ALTER TABLE `Question` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `QuestionInstance`
--

DROP TABLE IF EXISTS `QuestionInstance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `QuestionInstance` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `QuestionId` int(11) NOT NULL,
  `TimeStamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `RoomId` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `Duration` int(11) DEFAULT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `QuestionInstance`
--

LOCK TABLES `QuestionInstance` WRITE;
/*!40000 ALTER TABLE `QuestionInstance` DISABLE KEYS */;
/*!40000 ALTER TABLE `QuestionInstance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Quiz`
--

DROP TABLE IF EXISTS `Quiz`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Quiz` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `IsAnonymous` tinyint(1) DEFAULT NULL,
  `OwnerUserId` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Quiz`
--

LOCK TABLES `Quiz` WRITE;
/*!40000 ALTER TABLE `Quiz` DISABLE KEYS */;
/*!40000 ALTER TABLE `Quiz` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `QuizQuestion`
--

DROP TABLE IF EXISTS `QuizQuestion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `QuizQuestion` (
  `QuestionId` int(11) NOT NULL,
  `QuizId` int(11) NOT NULL,
  `OrderNr` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `QuizQuestion`
--

LOCK TABLES `QuizQuestion` WRITE;
/*!40000 ALTER TABLE `QuizQuestion` DISABLE KEYS */;
/*!40000 ALTER TABLE `QuizQuestion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Room`
--

DROP TABLE IF EXISTS `Room`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Room` (
  `Id` int(10) NOT NULL AUTO_INCREMENT,
  `QuizId` int(11) NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Room`
--

LOCK TABLES `Room` WRITE;
/*!40000 ALTER TABLE `Room` DISABLE KEYS */;
/*!40000 ALTER TABLE `Room` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `User`
--

DROP TABLE IF EXISTS `User`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `User` (
  `Id` int(50) NOT NULL AUTO_INCREMENT,
  `CanCreateQuiz` tinyint(1) NOT NULL,
  `Username` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `loginHash` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `User`
--

LOCK TABLES `User` WRITE;
/*!40000 ALTER TABLE `User` DISABLE KEYS */;
/*!40000 ALTER TABLE `User` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `UserInstance`
--

DROP TABLE IF EXISTS `UserInstance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `UserInstance` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `DisplayName` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `UserId` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `RoomId` varchar(10) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `UserInstance`
--

LOCK TABLES `UserInstance` WRITE;
/*!40000 ALTER TABLE `UserInstance` DISABLE KEYS */;
/*!40000 ALTER TABLE `UserInstance` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2018-08-17 17:10:54
