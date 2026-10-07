Om python inte kan hittas:

# Install pyenv with brew to manage different Python versions:
brew install pyenv
# List all installable versions with
pyenv install --list
# List installed versions with
pyenv versions
# Set global python version with
pyenv global 3.14.7
# Add 
eval "$(pyenv init --path)"

# START THE BACKEND
docker compose up --build -d backend
docker compose logs -f backend

http://localhost:8000/

# RUN SERVER
docker compose exec backend python manage.py migrate