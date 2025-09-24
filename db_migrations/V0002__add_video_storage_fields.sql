-- Добавляем поля для хранения видео-файлов и геолокации
ALTER TABLE user_videos 
ADD COLUMN video_data bytea,
ADD COLUMN video_url varchar(500),
ADD COLUMN latitude decimal(10,8),
ADD COLUMN longitude decimal(11,8);