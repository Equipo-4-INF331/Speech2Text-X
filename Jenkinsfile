pipeline {
    agent any

    environment {
        NODE_ENV = 'production'
        OPEN_API_KEY = credentials('OPEN_API_KEY')
        PORT = credentials('PORT')
        PGUSER = credentials('PGUSER')
        PGPASSWORD = credentials('PGPASSWORD')
        PGHOST = credentials('PGHOST')
        PGDATABASE = credentials('PGDATABASE')
        AWS_S3_BUCKET = credentials('AWS_S3_BUCKET')
        AWS_REGION = credentials('AWS_REGION')
        AWS_ACCESS_KEY_ID = credentials('AWS_ACCESS_KEY_ID')
        AWS_SECRET_ACCESS_KEY = credentials('AWS_SECRET_ACCESS_KEY')


    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'hotfix/jenkinsfile',  // usa la rama actual del SCM
                    credentialsId: 'github-jenkins',
                    url: 'https://github.com/Equipo-4-INF331/Speech2Text-X.git'
            }
        }

        stage('Install dependencies') {
            parallel {
                stage('Backend install') {
                    steps {
                        dir('back') {
                            sh 'npm ci'
                        }
                    }
                }
                stage('Frontend install') {
                    steps {
                        dir('front') {
                            sh 'npm ci'
                        }
                    }
                }
            }
        }

        stage('Testing') {
            environment {
                NODE_ENV = 'development'
            }
            parallel {
                stage('Backend tests') {
                    steps {
                        dir('back') {
                            sh 'npm ci --include=dev'
                            sh 'npm run test'
                        }
                    }
                }
                stage('Frontend tests') {
                    steps {
                        dir('front') {
                            sh 'npm ci --include=dev'
                            sh 'npm run test'
                        }
                    }
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
                # Reiniciar el backend
                pm2 restart all || pm2 start back/index.js --name speech2text
                sudo systemctl restart nginx
                '''
            }
        }
    }

    post {
        always {
            echo 'Pipeline finalizado.'
        }
        failure {
            echo 'Algo falló durante el pipeline. Revisar logs.'
        }
        success {
            echo 'Pipeline completado con éxito.'
        }
    }
}
