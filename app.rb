require 'sinatra'

disable :logging
set :root, File.dirname(__FILE__) + "/../"
set :public_folder, File.dirname(__FILE__) + '/public'


get "/" do
  File.readlines("public/index.html")
end

get "/albums" do
  content_type "application/json"
  File.readlines("public/albums.json")
end

get "/favicon.ico" do
  ""
end

