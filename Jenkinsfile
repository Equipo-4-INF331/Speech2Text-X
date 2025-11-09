pipeline {
    agent any

    environment {
        NODE_ENV = 'production'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    credentialsId: 'github-jenkins',
                    url: 'https://github.com/Equipo-4-INF331/Speech2Text-X.git'
            }
        }

        stage('Backend setup') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Frontend build') {
            steps {
                dir('front') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                # Reiniciar el backend
                pm2 restart all || pm2 start back/index.js --name speech2text
                sudo systemctl restart nginx
                '''
            }
        }
    }
}
