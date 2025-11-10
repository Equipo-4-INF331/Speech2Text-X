pipeline {
    agent any

    environment {
        NODE_ENV = 'production'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'hotfix/jenkinsfile',
                    credentialsId: 'github-jenkins',
                    url: 'https://github.com/Equipo-4-INF331/Speech2Text-X.git'
            }
        }

        stage('Backend setup') {
            steps {
                dir('back') {
                    sh 'npm ci'
                }
            }
        }

        stage('Backend tests') {
            steps {
                dir('back') {
                    sh '''
                    echo "Running backend tests..."
                    npm test || { echo "Backend tests failed"; exit 1; }
                    '''
                }
            }
        }

        stage('Frontend setup') {
            steps {
                dir('front') {
                    sh 'npm ci'
                }
            }
        }

        stage('Frontend tests') {
            steps {
                dir('front') {
                    sh '''
                    echo "Running frontend tests..."
                    npm test || { echo "Frontend tests failed"; exit 1; }
                    '''
                }
            }
        }

        stage('Frontend build') {
            steps {
                dir('front') {
                    sh 'npm run build'
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                echo "Deploying application..."
                pm2 restart all || pm2 start back/index.js --name speech2text
                sudo systemctl restart nginx
                '''
            }
        }
    }

    post {
        failure {
            echo '❌ Pipeline failed!'
        }
        success {
            echo '✅ Deployment successful!'
        }
    }
}

